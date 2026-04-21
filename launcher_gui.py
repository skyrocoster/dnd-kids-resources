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
    QPushButton, QTextEdit, QLabel, QTabWidget, QGroupBox, QStatusBar,
    QInputDialog
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
            
            commands = self.command_list
            if isinstance(commands, (list, tuple)) and commands and isinstance(commands[0], (list, tuple)):
                return_code = 0
                for command in commands:
                    self.process = subprocess.Popen(
                        command,
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

                    if self.process and self.process.stdout:
                        for line in self.process.stdout:
                            self.output_signal.emit(line.rstrip('\n'))
                        self.process.wait()
                        return_code = self.process.returncode
                        if return_code != 0:
                            break
                    else:
                        self.error_signal.emit("Error: Process failed to start or no stdout available.")
                        return_code = -1
                        break

                self.finished_signal.emit(return_code)
            else:
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

                if self.process and self.process.stdout:
                    for line in self.process.stdout:
                        self.output_signal.emit(line.rstrip('\n'))
                    self.process.wait()
                    self.finished_signal.emit(self.process.returncode)
                else:
                    self.error_signal.emit("Error: Process failed to start or no stdout available.")
                    self.finished_signal.emit(-1)
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

    def closeEvent(self, a0):
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
            if a0 is not None:
                a0.accept()

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

        # Git Operations Tab
        git_tab = QWidget()
        git_layout = QVBoxLayout(git_tab)
        git_layout.addWidget(self._create_git_section())
        tabs.addTab(git_tab, "Git")

        # Status Bar removed for compatibility

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

        export_btn = QPushButton("🗂️ Export Seeds")
        export_btn.setToolTip("Export current database seed tables to data/seeds")
        export_btn.clicked.connect(self._export_seed_files)
        controls_layout.addWidget(export_btn)

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
        # Status bar usage removed for compatibility
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

    def _export_seed_files(self):
        """Export current DB seed tables to JSON files."""
        self.db_terminal.clear()
        self._log_to_terminal(self.db_terminal, "Exporting seed files from database...", "Database")
        script = self.workspace_root / "_dev" / "export_db_seeds.py"
        command_list = [sys.executable, str(script)]
        self._run_command(command_list, "Export Seeds", self.db_terminal)

    def _create_git_section(self):
        """Create Git control section with commit and push buttons."""
        group = QGroupBox("Git Operations")
        layout = QVBoxLayout()

        controls_layout = QHBoxLayout()

        self.git_commit_btn = QPushButton("🧾 Commit")
        self.git_commit_btn.setToolTip("Stage all changes and commit with a message")
        self.git_commit_btn.clicked.connect(self._commit_changes)
        controls_layout.addWidget(self.git_commit_btn)

        self.git_push_btn = QPushButton("📤 Push")
        self.git_push_btn.setToolTip("Push committed changes to GitHub")
        self.git_push_btn.clicked.connect(self._push_changes)
        controls_layout.addWidget(self.git_push_btn)

        self.git_commit_push_btn = QPushButton("🔁 Commit + Push")
        self.git_commit_push_btn.setToolTip("Stage, commit, and push changes in one step")
        self.git_commit_push_btn.clicked.connect(self._commit_and_push)
        controls_layout.addWidget(self.git_commit_push_btn)

        controls_layout.addStretch()
        layout.addLayout(controls_layout)

        self.git_terminal = QTextEdit()
        self.git_terminal.setReadOnly(True)
        self.git_terminal.setFont(QFont("Courier", 9))
        self.git_terminal.setStyleSheet("background-color: #1e1e1e; color: #d4d4d4;")
        layout.addWidget(self.git_terminal)

        clear_btn = QPushButton("Clear Output")
        clear_btn.clicked.connect(self.git_terminal.clear)
        layout.addWidget(clear_btn)

        group.setLayout(layout)
        return group

    def _prompt_commit_message(self):
        message, ok = QInputDialog.getText(self, "Commit message", "Enter commit message:")
        if ok:
            return message.strip()
        return None

    def _commit_changes(self):
        commit_message = self._prompt_commit_message()
        if not commit_message:
            self._log_to_terminal(self.git_terminal, "Commit canceled: no message provided.", "Git")
            return

        self.git_terminal.clear()
        self._log_to_terminal(self.git_terminal, f"Staging changes and committing: {commit_message}", "Git")
        commands = [
            ["git", "add", "-A"],
            ["git", "commit", "-m", commit_message]
        ]
        self._run_command(commands, "Git Commit", self.git_terminal)

    def _push_changes(self):
        self._log_to_terminal(self.git_terminal, "Pushing commits to GitHub...", "Git")
        command_list = ["git", "push"]
        self._run_command(command_list, "Git Push", self.git_terminal)

    def _commit_and_push(self):
        commit_message = self._prompt_commit_message()
        if not commit_message:
            self._log_to_terminal(self.git_terminal, "Commit + Push canceled: no message provided.", "Git")
            return

        self.git_terminal.clear()
        self._log_to_terminal(self.git_terminal, f"Staging, committing, and pushing: {commit_message}", "Git")
        commands = [
            ["git", "add", "-A"],
            ["git", "commit", "-m", commit_message],
            ["git", "push"]
        ]
        self._run_command(commands, "Git Commit + Push", self.git_terminal)

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
