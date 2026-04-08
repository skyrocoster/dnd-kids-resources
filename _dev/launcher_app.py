#!/usr/bin/env python3
"""
D&D Stat Block Queue Manager - Desktop Control Panel (PyQt5)

A PyQt5 desktop application for managing the queue worker.
The Flask server is managed separately.

Provides:
- Worker start/stop/restart controls
- Real-time queue statistics
- Current job progress display
- Recent jobs history
- Worker logs
"""

import sys
import subprocess
import json
import time
from pathlib import Path
from datetime import datetime

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QTabWidget, QTableWidget, QTableWidgetItem,
    QTextEdit, QGridLayout, QGroupBox, QProgressBar
)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QObject, QThread
from PyQt5.QtGui import QFont, QColor, QIcon
from PyQt5.QtNetwork import QNetworkAccessManager
import urllib.request
import urllib.error
import threading


# Paths
APP_ROOT = Path(__file__).parent.parent
WORKER_SCRIPT = Path(__file__).parent / "queue_worker.py"
VENV_PATH = APP_ROOT / ".venv"


class StatusSignals(QObject):
    """Signals for status updates from worker threads."""
    stats_updated = pyqtSignal(dict)
    recent_jobs_updated = pyqtSignal(list)
    server_status_changed = pyqtSignal(bool)
    worker_status_changed = pyqtSignal(bool)
    log_message = pyqtSignal(str, str)  # (message, level)


class FetchStatsWorker(QThread):
    """Background thread for fetching queue statistics."""
    
    stats_ready = pyqtSignal(dict)
    error_occurred = pyqtSignal(str)
    
    def run(self):
        try:
            with urllib.request.urlopen('http://localhost:8000/api/queue/stats', timeout=2) as response:
                data = json.loads(response.read().decode())
                self.stats_ready.emit(data)
        except Exception as e:
            self.error_occurred.emit(str(e))


class FetchRecentJobsWorker(QThread):
    """Background thread for fetching recent jobs."""
    
    jobs_ready = pyqtSignal(list)
    error_occurred = pyqtSignal(str)
    
    def run(self):
        try:
            with urllib.request.urlopen('http://localhost:8000/api/queue/recent?limit=10', timeout=2) as response:
                data = json.loads(response.read().decode())
                self.jobs_ready.emit(data)
        except Exception as e:
            self.error_occurred.emit(str(e))


class QueueManagerApp(QMainWindow):
    """Main application window."""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("D&D Stat Block Queue Manager")
        self.setGeometry(100, 100, 1200, 800)
        
        # Process management
        self.worker_process = None
        self.worker_logs = []
        
        # Thread management
        self.active_threads = []
        self.reader_thread = None
        
        # Signals
        self.signals = StatusSignals()
        self.signals.log_message.connect(self.log_worker)
        
        # Setup UI
        self.setup_ui()
        
        # Auto-update timers
        self.stats_timer = QTimer()
        self.stats_timer.timeout.connect(self.fetch_stats)
        self.stats_timer.start(2000)  # Update every 2 seconds
        
        self.jobs_timer = QTimer()
        self.jobs_timer.timeout.connect(self.fetch_recent_jobs)
        self.jobs_timer.start(3000)  # Update every 3 seconds
    
    def setup_ui(self):
        """Build the UI."""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(10)
        
        # Title
        title = QLabel("D&D Stat Block Queue Manager")
        title_font = QFont()
        title_font.setPointSize(16)
        title_font.setBold(True)
        title.setFont(title_font)
        main_layout.addWidget(title)
        
        # Server Controls Panel
        main_layout.addWidget(self.create_controls_panel())
        
        # Model Status Panel
        main_layout.addWidget(self.create_model_status_panel())
        
        # Queue Status Panel
        main_layout.addWidget(self.create_stats_panel())
        
        # Tabs for detailed info
        tabs = QTabWidget()
        tabs.addTab(self.create_recent_jobs_panel(), "Recent Jobs")
        tabs.addTab(self.create_logs_panel(), "Logs")
        main_layout.addWidget(tabs)
    
    def create_controls_panel(self):
        """Create the worker controls panel."""
        panel = QGroupBox("Queue Worker Controls")
        layout = QHBoxLayout()
        
        # Title and font
        control_font = QFont()
        control_font.setPointSize(10)
        control_font.setBold(True)
        
        # Worker Controls
        worker_label = QLabel("⚙️ Queue Worker")
        worker_label.setFont(control_font)
        
        self.worker_status_label = QLabel("● Stopped")
        self.worker_status_label.setStyleSheet("color: red; font-weight: bold;")
        
        self.btn_worker_start = QPushButton("Start")
        self.btn_worker_start.clicked.connect(self.start_worker)
        
        self.btn_worker_stop = QPushButton("Stop")
        self.btn_worker_stop.clicked.connect(self.stop_worker)
        self.btn_worker_stop.setEnabled(False)
        
        self.btn_worker_restart = QPushButton("Restart")
        self.btn_worker_restart.clicked.connect(self.restart_worker)
        self.btn_worker_restart.setEnabled(False)
        
        layout.addWidget(worker_label)
        layout.addWidget(self.worker_status_label)
        layout.addWidget(self.btn_worker_start)
        layout.addWidget(self.btn_worker_stop)
        layout.addWidget(self.btn_worker_restart)
        
        layout.addStretch()
        
        # Note about server being managed separately
        note_label = QLabel("(Flask Server managed separately)")
        note_label.setStyleSheet("color: #666; font-style: italic;")
        layout.addWidget(note_label)
        
        panel.setLayout(layout)
        return panel
    
    def create_model_status_panel(self):
        """Create the model status panel."""
        panel = QGroupBox("AI Model Status")
        layout = QHBoxLayout()
        
        # Title and font
        model_font = QFont()
        model_font.setPointSize(10)
        model_font.setBold(True)
        
        # Model Label
        model_label = QLabel("🧠 Model")
        model_label.setFont(model_font)
        
        self.model_status_label = QLabel("● Unloaded")
        self.model_status_label.setStyleSheet("color: gray; font-weight: bold;")
        
        # Model name
        self.model_name_label = QLabel("Checking...")
        self.model_name_label.setStyleSheet("color: #666; font-size: 9pt;")
        
        layout.addWidget(model_label)
        layout.addWidget(self.model_status_label)
        layout.addSpacing(20)
        layout.addWidget(self.model_name_label)
        layout.addStretch()
        
        panel.setLayout(layout)
        
        # Start timers to update status
        self.model_status_timer = QTimer()
        self.model_status_timer.timeout.connect(self.update_model_status)
        self.model_status_timer.start(1000)  # Update every second
        
        return panel
    
    def update_model_status(self):
        """Update model status based on worker and job state."""
        if self.worker_process is None or self.worker_process.poll() is not None:
            # Worker is not running
            status_text = "● Unloaded (Worker Stopped)"
            status_color = "gray"
        else:
            # Worker is running - check if there are pending jobs
            # If there are pending jobs, model will load on-demand
            status_text = "◐ Running (On-Demand Loading)"
            status_color = "orange"
        
        self.model_status_label.setText(status_text)
        self.model_status_label.setStyleSheet(f"color: {status_color}; font-weight: bold;")
        
        # Check for model file
        model_candidates = [
            APP_ROOT / "models" / "mistral.gguf",
            APP_ROOT / "models" / "mistral-7b-instruct-v0.1.Q4_K_M.gguf",
            APP_ROOT / "models" / "tinyllama.gguf",
            APP_ROOT / "models" / "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
        ]
        
        model_file = None
        for candidate in model_candidates:
            if candidate.exists():
                model_file = candidate
                break
        
        if model_file:
            size_mb = model_file.stat().st_size / (1024 * 1024)
            self.model_name_label.setText(f"{model_file.name} ({size_mb:.1f} MB)")
        else:
            self.model_name_label.setText("⚠️ No model file found")
            self.model_name_label.setStyleSheet("color: red; font-size: 9pt;")
    
    
    def create_controls_panel(self):
        """Create the worker controls panel."""
        panel = QGroupBox("Queue Worker Controls")
        layout = QHBoxLayout()
        
        # Title and font
        control_font = QFont()
        control_font.setPointSize(10)
        control_font.setBold(True)
        
        # Worker Controls Only
        worker_label = QLabel("⚙️ Queue Worker")
        worker_label.setFont(control_font)
        
        self.worker_status_label = QLabel("● Stopped")
        self.worker_status_label.setStyleSheet("color: red; font-weight: bold;")
        
        self.btn_worker_start = QPushButton("Start")
        self.btn_worker_start.clicked.connect(self.start_worker)
        
        self.btn_worker_stop = QPushButton("Stop")
        self.btn_worker_stop.clicked.connect(self.stop_worker)
        self.btn_worker_stop.setEnabled(False)
        
        self.btn_worker_restart = QPushButton("Restart")
        self.btn_worker_restart.clicked.connect(self.restart_worker)
        self.btn_worker_restart.setEnabled(False)
        
        layout.addWidget(worker_label)
        layout.addWidget(self.worker_status_label)
        layout.addWidget(self.btn_worker_start)
        layout.addWidget(self.btn_worker_stop)
        layout.addWidget(self.btn_worker_restart)
        
        layout.addStretch()
        
        # Note about server being managed separately
        note_label = QLabel("(Flask Server managed separately)")
        note_label.setStyleSheet("color: #666; font-style: italic;")
        layout.addWidget(note_label)
        
        panel.setLayout(layout)
        return panel
    
    def create_stats_panel(self):
        """Create the queue statistics panel."""
        panel = QGroupBox("Queue Status")
        layout = QGridLayout()
        
        # Stats labels
        self.label_pending = QLabel("Pending: 0")
        self.label_processing = QLabel("Processing: 0")
        self.label_completed = QLabel("Completed: 0")
        self.label_failed = QLabel("Failed: 0")
        self.label_avg_time = QLabel("Avg Parse Time: 0s")
        
        stats_font = QFont()
        stats_font.setPointSize(11)
        stats_font.setBold(True)
        
        for label in [self.label_pending, self.label_processing, self.label_completed, 
                      self.label_failed, self.label_avg_time]:
            label.setFont(stats_font)
        
        layout.addWidget(QLabel("📊 Queue Statistics"), 0, 0, 1, 5)
        layout.addWidget(self.label_pending, 1, 0)
        layout.addWidget(self.label_processing, 1, 1)
        layout.addWidget(self.label_completed, 1, 2)
        layout.addWidget(self.label_failed, 1, 3)
        layout.addWidget(self.label_avg_time, 1, 4)
        
        # Current Job
        layout.addWidget(QLabel("Currently Processing"), 2, 0, 1, 5)
        
        self.label_current_job = QLabel("None")
        self.progress_current_job = QProgressBar()
        self.progress_current_job.setMaximum(100)
        
        layout.addWidget(self.label_current_job, 3, 0, 1, 2)
        layout.addWidget(self.progress_current_job, 3, 2, 1, 3)
        
        panel.setLayout(layout)
        return panel
    
    def create_recent_jobs_panel(self):
        """Create the recent jobs table."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        self.table_recent_jobs = QTableWidget()
        self.table_recent_jobs.setColumnCount(5)
        self.table_recent_jobs.setHorizontalHeaderLabels(
            ["Job ID", "Status", "Creature", "Creature ID", "Time (seconds)"]
        )
        self.table_recent_jobs.setAlternatingRowColors(True)
        self.table_recent_jobs.setColumnWidth(0, 60)
        self.table_recent_jobs.setColumnWidth(1, 100)
        self.table_recent_jobs.setColumnWidth(2, 200)
        self.table_recent_jobs.setColumnWidth(3, 100)
        self.table_recent_jobs.setColumnWidth(4, 100)
        
        layout.addWidget(self.table_recent_jobs)
        return widget
    
    def create_logs_panel(self):
        """Create the logs display panel."""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # Worker logs only (server logs removed for separated operation)
        worker_log_group = QGroupBox("Queue Worker Logs")
        worker_log_layout = QVBoxLayout()
        self.text_worker_logs = QTextEdit()
        self.text_worker_logs.setReadOnly(True)
        worker_log_layout.addWidget(self.text_worker_logs)
        worker_log_group.setLayout(worker_log_layout)
        layout.addWidget(worker_log_group)
        
        return widget
    
    def start_worker(self):
        """Start the queue worker."""
        if self.worker_process is not None:
            return
        
        self.signals.log_message.emit("[LAUNCHER] Starting queue worker...", "info")
        
        try:
            # Build command with venv activation
            if VENV_PATH.exists():
                python_exe = VENV_PATH / "Scripts" / "python.exe"
            else:
                python_exe = "python"
            
            self.worker_process = subprocess.Popen(
                [str(python_exe), str(WORKER_SCRIPT), "--verbose"],
                cwd=str(APP_ROOT),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            self.worker_status_label.setText("● Running")
            self.worker_status_label.setStyleSheet("color: green; font-weight: bold;")
            
            self.btn_worker_start.setEnabled(False)
            self.btn_worker_stop.setEnabled(True)
            self.btn_worker_restart.setEnabled(True)
            
            self.signals.log_message.emit("[LAUNCHER] ✓ Queue worker started (PID: {})".format(self.worker_process.pid), "success")
            
            # Start output reader in a daemon thread
            self.reader_thread = threading.Thread(target=self.read_worker_output, daemon=True)
            self.reader_thread.start()
        
        except Exception as e:
            self.signals.log_message.emit(f"[LAUNCHER] ✗ Failed to start worker: {e}", "error")
    
    def stop_worker(self):
        """Stop the queue worker."""
        if self.worker_process is None:
            return
        
        self.signals.log_message.emit("[LAUNCHER] Stopping queue worker...", "info")
        
        try:
            self.worker_process.terminate()
            self.worker_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.worker_process.kill()
        finally:
            self.worker_process = None
            
            self.worker_status_label.setText("● Stopped")
            self.worker_status_label.setStyleSheet("color: red; font-weight: bold;")
            
            self.btn_worker_start.setEnabled(True)
            self.btn_worker_stop.setEnabled(False)
            self.btn_worker_restart.setEnabled(False)
            
            self.signals.log_message.emit("[LAUNCHER] ✓ Queue worker stopped", "success")
    
    def restart_worker(self):
        """Restart the queue worker."""
        self.stop_worker()
        time.sleep(1)
        self.start_worker()
    
    def read_worker_output(self):
        """Read worker output in a thread."""
        if self.worker_process:
            try:
                for line in self.worker_process.stdout:
                    if line.strip():
                        self.signals.log_message.emit(line.strip(), "output")
            except Exception as e:
                self.signals.log_message.emit(f"[ERROR] Failed to read output: {e}", "error")
    
    def log_worker(self, message, level="info"):
        """Add message to worker logs (called from main thread via signal)."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        formatted = f"[{timestamp}] {message}"
        
        self.worker_logs.append(formatted)
        if len(self.worker_logs) > 1000:  # Keep last 1000 lines
            self.worker_logs = self.worker_logs[-1000:]
        
        self.text_worker_logs.setText("\n".join(self.worker_logs))
        self.text_worker_logs.verticalScrollBar().setValue(
            self.text_worker_logs.verticalScrollBar().maximum()
        )
    
    def fetch_stats(self):
        """Fetch queue statistics from API."""
        worker = FetchStatsWorker()
        worker.stats_ready.connect(self.update_stats)
        worker.error_occurred.connect(self.on_fetch_stats_error)
        worker.finished.connect(lambda: self.cleanup_thread(worker))
        self.active_threads.append(worker)
        worker.start()
    
    def on_fetch_stats_error(self, error):
        """Handle stats fetch errors silently."""
        pass  # Silently ignore network errors during polling
    
    def update_stats(self, stats):
        """Update stats display."""
        self.label_pending.setText(f"Pending: {stats.get('pending', 0)}")
        self.label_processing.setText(f"Processing: {stats.get('processing', 0)}")
        self.label_completed.setText(f"Completed: {stats.get('completed', 0)}")
        self.label_failed.setText(f"Failed: {stats.get('failed', 0)}")
        self.label_avg_time.setText(f"Avg Parse Time: {stats.get('avg_parse_time', 0)}s")
        
        # Update current job
        job_id = stats.get('current_job_id')
        progress = stats.get('current_job_progress', 0)
        
        if job_id:
            self.label_current_job.setText(f"Job #{job_id}")
            self.progress_current_job.setValue(progress)
        else:
            self.label_current_job.setText("None")
            self.progress_current_job.setValue(0)
    
    def fetch_recent_jobs(self):
        """Fetch recent jobs from API."""
        worker = FetchRecentJobsWorker()
        worker.jobs_ready.connect(self.update_recent_jobs)
        worker.error_occurred.connect(self.on_fetch_jobs_error)
        worker.finished.connect(lambda: self.cleanup_thread(worker))
        self.active_threads.append(worker)
        worker.start()
    
    def on_fetch_jobs_error(self, error):
        """Handle jobs fetch errors silently."""
        pass  # Silently ignore network errors during polling
    
    def cleanup_thread(self, worker):
        """Remove finished thread from tracking list."""
        if worker in self.active_threads:
            self.active_threads.remove(worker)
    
    def update_recent_jobs(self, jobs):
        """Update recent jobs table."""
        self.table_recent_jobs.setRowCount(len(jobs))
        
        status_colors = {
            'completed': '#90EE90',
            'processing': '#FFD700',
            'pending': '#87CEEB',
            'failed': '#FFB6C6'
        }
        
        for row, job in enumerate(jobs):
            # Job ID
            item = QTableWidgetItem(str(job['id']))
            self.table_recent_jobs.setItem(row, 0, item)
            
            # Status
            status = job['status']
            item = QTableWidgetItem(status.capitalize())
            if status in status_colors:
                item.setBackground(QColor(status_colors[status]))
            self.table_recent_jobs.setItem(row, 1, item)
            
            # Creature title
            item = QTableWidgetItem(job.get('creature_title', 'N/A'))
            self.table_recent_jobs.setItem(row, 2, item)
            
            # Creature ID
            cid = job.get('creature_id')
            item = QTableWidgetItem(str(cid) if cid else "N/A")
            self.table_recent_jobs.setItem(row, 3, item)
            
            # Time
            elapsed = job.get('elapsed_seconds', 0)
            item = QTableWidgetItem(str(elapsed) if elapsed else "N/A")
            self.table_recent_jobs.setItem(row, 4, item)
    
    def closeEvent(self, event):
        """Clean up on window close."""
        self.stats_timer.stop()
        self.jobs_timer.stop()
        self.model_status_timer.stop()
        
        # Stop worker if running
        if self.worker_process:
            self.stop_worker()
        
        # Wait for reader thread to finish
        if self.reader_thread and self.reader_thread.is_alive():
            self.reader_thread.join(timeout=2)
        
        # Wait for active worker threads to finish
        for worker in self.active_threads:
            if worker.isRunning():
                worker.quit()
                worker.wait(timeout=2000)
        
        self.active_threads.clear()
        event.accept()


if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = QueueManagerApp()
    window.show()
    sys.exit(app.exec_())
