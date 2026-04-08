#!/usr/bin/env python3
"""
D&D Kids Resources - GUI Launcher Control Panel
Integrated queue worker with full terminal display.
"""

import sys
import subprocess
import socket
import threading
import os
from pathlib import Path
from datetime import datetime
from io import StringIO
import contextlib

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QTextEdit, QLabel, QTabWidget, QGroupBox, QStatusBar
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QTimer
from PyQt5.QtGui import QFont, QTextCursor, QColor


class CommandRunner(QThread):
    """Run a command in a separate thread to keep GUI responsive."""
    output_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(int)
    error_signal = pyqtSignal(str)

    def __init__(self, command_list, cwd=None):
        super().__init__()
        self.command_list = command_list
        self.cwd = cwd or str(Path(__file__).parent)
        self.process = None

    def run(self):
        try:
            # Use DETACHED_PROCESS on Windows to prevent console window
            creation_flags = 0x00000008 if sys.platform == 'win32' else 0
            
            # Set UTF-8 encoding for Python subprocess
            env = os.environ.copy()
            env['PYTHONIOENCODING'] = 'utf-8'
            
            self.process = subprocess.Popen(
                self.command_list,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace',
                shell=False,
                cwd=self.cwd,
                creationflags=creation_flags,
                env=env
            )

            for line in self.process.stdout:
                self.output_signal.emit(line.rstrip('\n'))

            self.process.wait()
            self.finished_signal.emit(self.process.returncode)
        except Exception as e:
            self.error_signal.emit(f"Error: {str(e)}")
            self.finished_signal.emit(-1)

    def stop_process(self):
        """Stop the running process."""
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except:
                try:
                    self.process.kill()
                except:
                    pass


class QueueWorkerRunner(QThread):
    """Run the queue worker directly in a thread with full threading support."""
    output_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(int)
    error_signal = pyqtSignal(str)

    def __init__(self, cwd=None):
        super().__init__()
        self.cwd = cwd or str(Path(__file__).parent)
        self.should_stop = False
        # Set thread priority to normal (doesn't block GUI)
        self.setPriority(QThread.NormalPriority)

    def run(self):
        """Run the queue worker directly with full threading support."""
        try:
            # Change to workspace directory FIRST (before any imports)
            os.chdir(self.cwd)
            
            # Add the workspace to path
            sys.path.insert(0, self.cwd)
            sys.path.insert(0, str(Path(self.cwd) / 'lib'))
            sys.path.insert(0, str(Path(self.cwd) / '_dev'))
            
            # Check model file and validate
            model_dir = Path(self.cwd) / "models"
            model_file = None
            
            if model_dir.exists():
                for candidate in [
                    model_dir / "mistral-7b-instruct-v0.1.Q4_K_M.gguf",
                    model_dir / "mistral.gguf",
                    model_dir / "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
                    model_dir / "tinyllama.gguf"
                ]:
                    if candidate.exists():
                        model_file = candidate
                        size_mb = candidate.stat().st_size / (1024*1024)
                        self.output_signal.emit(f"✓ Found model: {candidate.name} ({size_mb:.1f} MB)")
                        break
            
            if not model_file:
                self.output_signal.emit("❌ ERROR: No GGUF model files found in models/ directory")
                self.output_signal.emit(f"Expected location: {model_dir}")
                self.output_signal.emit("")
                self.output_signal.emit("To fix:")
                self.output_signal.emit("1. Place a GGUF model file in the models/ directory")
                self.output_signal.emit("2. Recommended: mistral-7b-instruct-v0.1.Q4_K_M.gguf")
                self.output_signal.emit("3. Or any other GGUF format model")
                self.finished_signal.emit(-1)
                return
            
            # Redirect stdout to capture print statements
            class OutputCapture:
                def __init__(self, signal):
                    self.signal = signal
                
                def write(self, text):
                    if text:
                        self.signal.emit(text.rstrip('\n'))
                
                def flush(self):
                    pass
            
            old_stdout = sys.stdout
            sys.stdout = OutputCapture(self.output_signal)
            
            try:
                # Import and run the queue worker loop
                from _dev.queue_worker import worker_loop
                
                self.output_signal.emit("="*60)
                self.output_signal.emit("Queue Worker: Starting...")
                self.output_signal.emit("="*60)
                self.output_signal.emit(f"Working directory: {self.cwd}")
                self.output_signal.emit(f"Model file: {model_file.name}")
                self.output_signal.emit("Running with full threading support for AI model")
                self.output_signal.emit("")
                
                # Run the worker loop - it can freely spawn threads for the AI model
                worker_loop(interval=2, verbose=True)
                self.finished_signal.emit(0)
            finally:
                sys.stdout = old_stdout
        except KeyboardInterrupt:
            self.output_signal.emit("Queue Worker: Stopped by user")
            self.finished_signal.emit(0)
        except Exception as e:
            self.error_signal.emit(f"Queue Worker Error: {str(e)}")
            self.output_signal.emit(f"Error: {str(e)}")
            import traceback
            self.output_signal.emit(traceback.format_exc())
            self.finished_signal.emit(-1)

    def stop_worker(self):
        """Stop the worker gracefully."""
        self.should_stop = True
        # Give it a moment to shut down gracefully
        self.quit()
        self.wait(timeout=5000)  # Wait up to 5 seconds
        # Force terminate if still running
        if self.isRunning():
            self.terminate()
            self.wait()


class LauncherGUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.workspace_root = Path(__file__).parent
        self.runners = {}
        self.running_tasks = {}
        
        # Setup polling timer
        self.poll_timer = QTimer()
        self.poll_timer.timeout.connect(self._poll_processes)
        self.poll_timer.start(1000)
        
        self.init_ui()
        self.setWindowTitle("D&D Kids Resources - Control Panel")
        self.setGeometry(100, 100, 1200, 800)
        
        self._check_running_on_startup()

    def closeEvent(self, event):
        """Handle window close event - stop all running processes."""
        self.poll_timer.stop()
        
        # Stop Flask Server if running
        flask_runner = self.runners.get("Flask Server")
        if flask_runner and self.flask_status_label.text() == "Status: 🟢 Running":
            self._log_to_terminal(self.flask_terminal, "Stopping Flask Server before close...", "Flask Server")
            flask_runner.stop_process()
            flask_runner.wait(timeout=3000)
        
        # Stop Queue Worker if running
        worker_runner = self.runners.get("Queue Worker")
        if worker_runner and self.worker_status_label.text() == "Status: 🟢 Running":
            self._log_to_terminal(self.worker_terminal, "Stopping Queue Worker before close...", "Queue Worker")
            worker_runner.stop_process()
            worker_runner.wait(timeout=3000)
        
        # Accept the close event
        event.accept()

    def init_ui(self):
        """Initialize the user interface."""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)

        # Title
        title = QLabel("D&D Kids Resources - Control Panel")
        title_font = QFont()
        title_font.setPointSize(14)
        title_font.setBold(True)
        title.setFont(title_font)
        layout.addWidget(title)

        # Create tabs
        tabs = QTabWidget()
        layout.addWidget(tabs)

        # Database Tab
        db_tab = QWidget()
        db_layout = QVBoxLayout(db_tab)
        db_layout.addWidget(self._create_db_controls())
        tabs.addTab(db_tab, "Database")

        # Flask Server Tab
        flask_tab = QWidget()
        flask_layout = QVBoxLayout(flask_tab)
        flask_layout.addWidget(self._create_flask_section())
        tabs.addTab(flask_tab, "Flask Server")

        # Queue Worker Tab
        worker_tab = QWidget()
        worker_layout = QVBoxLayout(worker_tab)
        worker_layout.addWidget(self._create_worker_section())
        tabs.addTab(worker_tab, "Queue Worker")

        # Status Bar
        self.statusBar().showMessage("Ready")

    def _create_db_controls(self):
        """Create database control section with terminal output."""
        group = QGroupBox("Database Operations")
        layout = QVBoxLayout()

        # Control buttons
        controls_layout = QHBoxLayout()
        
        rebuild_btn = QPushButton("🔨 Init Schema")
        rebuild_btn.setToolTip("Initialize database schema (DESTRUCTIVE - will drop existing tables)")
        rebuild_btn.clicked.connect(self._rebuild_db)
        controls_layout.addWidget(rebuild_btn)

        reseed_btn = QPushButton("🌱 Reseed (Force)")
        reseed_btn.setToolTip("Force reload all seed data (will clear existing data)")
        reseed_btn.clicked.connect(self._reseed_db)
        controls_layout.addWidget(reseed_btn)

        controls_layout.addStretch()
        layout.addLayout(controls_layout)

        # Terminal
        self.db_terminal = QTextEdit()
        self.db_terminal.setReadOnly(True)
        self.db_terminal.setFont(QFont("Courier", 9))
        self.db_terminal.setStyleSheet("background-color: #1e1e1e; color: #d4d4d4;")
        layout.addWidget(self.db_terminal)

        # Clear button
        clear_btn = QPushButton("Clear Output")
        clear_btn.clicked.connect(self.db_terminal.clear)
        layout.addWidget(clear_btn)

        group.setLayout(layout)
        return group

    def _create_flask_section(self):
        """Create Flask server section with status and terminal."""
        group = QGroupBox("Flask Web Server")
        layout = QVBoxLayout()

        # Status and controls
        controls_layout = QHBoxLayout()
        self.flask_status_label = QLabel("Status: ⚫ Stopped")
        status_font = QFont()
        status_font.setPointSize(10)
        status_font.setBold(True)
        self.flask_status_label.setFont(status_font)
        controls_layout.addWidget(self.flask_status_label)

        self.flask_start_btn = QPushButton("🚀 Start")
        self.flask_start_btn.clicked.connect(self._start_flask)
        controls_layout.addWidget(self.flask_start_btn)

        self.flask_stop_btn = QPushButton("⏹️ Stop")
        self.flask_stop_btn.clicked.connect(self._stop_flask)
        self.flask_stop_btn.setEnabled(False)
        controls_layout.addWidget(self.flask_stop_btn)

        controls_layout.addStretch()
        layout.addLayout(controls_layout)

        # Terminal
        self.flask_terminal = QTextEdit()
        self.flask_terminal.setReadOnly(True)
        self.flask_terminal.setFont(QFont("Courier", 9))
        self.flask_terminal.setStyleSheet("background-color: #1e1e1e; color: #d4d4d4;")
        layout.addWidget(self.flask_terminal)

        # Clear button
        clear_btn = QPushButton("Clear Output")
        clear_btn.clicked.connect(self.flask_terminal.clear)
        layout.addWidget(clear_btn)

        group.setLayout(layout)
        return group

    def _create_worker_section(self):
        """Create Queue Worker section with status and terminal."""
        group = QGroupBox("Background AI Worker (Queue Processing)")
        layout = QVBoxLayout()

        # Status and controls
        controls_layout = QHBoxLayout()
        self.worker_status_label = QLabel("Status: ⚫ Stopped")
        status_font = QFont()
        status_font.setPointSize(10)
        status_font.setBold(True)
        self.worker_status_label.setFont(status_font)
        controls_layout.addWidget(self.worker_status_label)

        self.worker_start_btn = QPushButton("⚙️ Start")
        self.worker_start_btn.clicked.connect(self._start_worker)
        controls_layout.addWidget(self.worker_start_btn)

        self.worker_stop_btn = QPushButton("⏹️ Stop")
        self.worker_stop_btn.clicked.connect(self._stop_worker)
        self.worker_stop_btn.setEnabled(False)
        controls_layout.addWidget(self.worker_stop_btn)

        controls_layout.addStretch()
        layout.addLayout(controls_layout)

        # Terminal
        self.worker_terminal = QTextEdit()
        self.worker_terminal.setReadOnly(True)
        self.worker_terminal.setFont(QFont("Courier", 9))
        self.worker_terminal.setStyleSheet("background-color: #1e1e1e; color: #d4d4d4;")
        layout.addWidget(self.worker_terminal)

        # Clear button
        clear_btn = QPushButton("Clear Output")
        clear_btn.clicked.connect(self.worker_terminal.clear)
        layout.addWidget(clear_btn)

        group.setLayout(layout)
        return group

    def _log_to_terminal(self, terminal, message, task_name=""):
        """Log message to terminal."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = f"[{timestamp}]" + (f" [{task_name}]" if task_name else "")
        full_message = f"{prefix} {message}"

        terminal.append(full_message)
        cursor = terminal.textCursor()
        cursor.movePosition(QTextCursor.End)
        terminal.setTextCursor(cursor)

    def _run_command(self, command_list, task_name, terminal):
        """Run a command and display output."""
        self.running_tasks[task_name] = True
        self._log_to_terminal(terminal, f"Starting: {task_name}", task_name)
        self.statusBar().showMessage(f"Running: {task_name}")

        runner = CommandRunner(command_list, cwd=str(self.workspace_root))
        runner.output_signal.connect(lambda msg: self._on_output(msg, task_name, terminal))
        runner.finished_signal.connect(lambda code: self._on_command_done(code, task_name, terminal))
        runner.error_signal.connect(lambda err: self._log_to_terminal(terminal, err, task_name))
        runner.start()

        self.runners[task_name] = runner

    def _on_output(self, message, task_name, terminal):
        """Handle command output."""
        self._log_to_terminal(terminal, message, task_name)
        
        # Detect when services are running
        if task_name == "Flask Server" and "Running on" in message:
            self.flask_status_label.setText("Status: 🟢 Running")
            self.flask_start_btn.setEnabled(False)
            self.flask_stop_btn.setEnabled(True)
        elif task_name == "Queue Worker" and "Starting main loop" in message:
            self.worker_status_label.setText("Status: 🟢 Running")
            self.worker_start_btn.setEnabled(False)
            self.worker_stop_btn.setEnabled(True)

    def _on_command_done(self, return_code, task_name, terminal):
        """Handle command completion."""
        self.running_tasks[task_name] = False
        
        if return_code == 0:
            self._log_to_terminal(terminal, "✓ Completed successfully", task_name)
        else:
            self._log_to_terminal(terminal, f"✗ Failed with code {return_code}", task_name)
        
        if task_name == "Flask Server":
            if return_code != 0:
                self.flask_status_label.setText("Status: 🔴 Error")
            else:
                self.flask_status_label.setText("Status: ⚫ Stopped")
            self.flask_start_btn.setEnabled(True)
            self.flask_stop_btn.setEnabled(False)
        elif task_name == "Queue Worker":
            if return_code != 0:
                self.worker_status_label.setText("Status: 🔴 Error")
            else:
                self.worker_status_label.setText("Status: ⚫ Stopped")
            self.worker_start_btn.setEnabled(True)
            self.worker_stop_btn.setEnabled(False)

    def _poll_processes(self):
        """Periodically check if running processes are still alive."""
        flask_runner = self.runners.get("Flask Server")
        if flask_runner and self.flask_status_label.text() == "Status: 🟢 Running":
            if flask_runner.process and flask_runner.process.poll() is not None:
                self.flask_status_label.setText("Status: 🔴 Crashed")
                self.flask_start_btn.setEnabled(True)
                self.flask_stop_btn.setEnabled(False)
                self._log_to_terminal(self.flask_terminal, "⚠️ Process crashed!", "Flask Server")

        worker_runner = self.runners.get("Queue Worker")
        if worker_runner and self.worker_status_label.text() == "Status: 🟢 Running":
            if worker_runner.process and worker_runner.process.poll() is not None:
                self.worker_status_label.setText("Status: 🔴 Crashed")
                self.worker_start_btn.setEnabled(True)
                self.worker_stop_btn.setEnabled(False)
                self._log_to_terminal(self.worker_terminal, "⚠️ Process crashed!", "Queue Worker")

    def _check_running_on_startup(self):
        """Check if Flask Server is running on startup."""
        if self._is_port_open("127.0.0.1", 8000):
            self.flask_status_label.setText("Status: 🟢 Running (already started)")
            self.flask_start_btn.setEnabled(False)
            self.flask_stop_btn.setEnabled(True)
            self.running_tasks["Flask Server"] = True
            self._log_to_terminal(self.flask_terminal, "Detected Flask Server already running on port 8000", "Flask Server")

    def _is_port_open(self, host, port):
        """Check if a port is open."""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((host, port))
            sock.close()
            return result == 0
        except:
            return False

    def _rebuild_db(self):
        """Rebuild database from scratch."""
        self.db_terminal.clear()
        self._log_to_terminal(self.db_terminal, "Initializing database schema...", "Database")
        script = self.workspace_root / "_dev" / "init_database.py"
        command_list = [sys.executable, str(script)]
        self._run_command(command_list, "Rebuild DB", self.db_terminal)

    def _reseed_db(self):
        """Reseed database with forced reload."""
        self.db_terminal.clear()
        self._log_to_terminal(self.db_terminal, "Reseeding database with forced reload...", "Database")
        script = self.workspace_root / "_dev" / "seed_database.py"
        command_list = [sys.executable, str(script), "--force"]
        self._run_command(command_list, "Reseed DB", self.db_terminal)

    def _create_temp_output_window(self, title):
        """Create a temporary output window for database operations."""
        widget = QTextEdit()
        widget.setReadOnly(True)
        widget.setFont(QFont("Courier", 9))
        widget.setStyleSheet("background-color: #1e1e1e; color: #d4d4d4;")
        return widget

    def _start_flask(self):
        """Start Flask server."""
        script = self.workspace_root / "server_flask.py"
        command_list = [sys.executable, str(script)]
        self.flask_status_label.setText("Status: 🟡 Starting...")
        self.flask_start_btn.setEnabled(False)
        self.flask_stop_btn.setEnabled(False)
        self._run_command(command_list, "Flask Server", self.flask_terminal)

    def _stop_flask(self):
        """Stop Flask server."""
        runner = self.runners.get("Flask Server")
        if runner:
            runner.stop_process()
            self.flask_status_label.setText("Status: 🟡 Stopping...")
            self._log_to_terminal(self.flask_terminal, "Stopping Flask Server...", "Flask Server")

    def _start_worker(self):
        """Start Queue Worker as a subprocess (like Flask Server)."""
        script = self.workspace_root / "_dev" / "queue_worker.py"
        command_list = [sys.executable, str(script)]
        self.worker_status_label.setText("Status: 🟡 Starting...")
        self.worker_start_btn.setEnabled(False)
        self.worker_stop_btn.setEnabled(False)
        self._run_command(command_list, "Queue Worker", self.worker_terminal)

    def _stop_worker(self):
        """Stop Queue Worker."""
        runner = self.runners.get("Queue Worker")
        if runner:
            runner.stop_process()
            self.worker_status_label.setText("Status: 🟡 Stopping...")
            self._log_to_terminal(self.worker_terminal, "Stopping Queue Worker...", "Queue Worker")


def main():
    app = QApplication(sys.argv)
    gui = LauncherGUI()
    gui.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
