#!/usr/bin/env python3
"""
D&D Kids Resources - Queue Monitor GUI
A proper GUI interface for managing the stat block parsing queue.

Features:
- Start/stop queue worker
- Monitor Flask server status
- View queue statistics
- See live job logs
"""

import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import threading
import sqlite3
from pathlib import Path
from datetime import datetime
import time
import psutil

# Database path
DB_PATH = Path(__file__).parent / "dnd_kids_resources.db"
WORKER_SCRIPT = Path(__file__).parent / "_dev" / "queue_worker.py"

class QueueMonitorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("D&D Kids Resources - Queue Monitor")
        self.root.geometry("900x600")
        self.root.resizable(True, True)
        
        # Process references
        self.worker_process = None
        self.is_worker_running = False
        
        # Set up UI
        self.setup_ui()
        
        # Start background monitoring
        self.monitor_thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.monitor_thread.start()
    
    def setup_ui(self):
        """Create the main UI layout."""
        # Title
        title_frame = ttk.Frame(self.root)
        title_frame.pack(fill=tk.X, padx=10, pady=10)
        
        title_label = ttk.Label(title_frame, text="Queue Worker Monitor", 
                                font=("Arial", 16, "bold"))
        title_label.pack(side=tk.LEFT)
        
        # Status bar
        status_frame = ttk.LabelFrame(self.root, text="System Status", padding=10)
        status_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.flask_status_label = ttk.Label(status_frame, text="Flask Server: Checking...", 
                                            foreground="gray")
        self.flask_status_label.pack(anchor=tk.W, pady=2)
        
        self.worker_status_label = ttk.Label(status_frame, text="Queue Worker: Stopped", 
                                             foreground="red")
        self.worker_status_label.pack(anchor=tk.W, pady=2)
        
        # Control buttons
        control_frame = ttk.Frame(self.root)
        control_frame.pack(fill=tk.X, padx=10, pady=10)
        
        self.start_btn = ttk.Button(control_frame, text="▶ Start Queue Worker", 
                                     command=self.start_worker)
        self.start_btn.pack(side=tk.LEFT, padx=5)
        
        self.stop_btn = ttk.Button(control_frame, text="⏹ Stop Queue Worker", 
                                    command=self.stop_worker, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=5)
        
        self.refresh_btn = ttk.Button(control_frame, text="⟳ Refresh Stats", 
                                       command=self.refresh_stats)
        self.refresh_btn.pack(side=tk.LEFT, padx=5)
        
        # Queue statistics
        stats_frame = ttk.LabelFrame(self.root, text="Queue Statistics", padding=10)
        stats_frame.pack(fill=tk.X, padx=10, pady=5)
        
        stats_inner = ttk.Frame(stats_frame)
        stats_inner.pack(fill=tk.X)
        
        self.pending_label = ttk.Label(stats_inner, text="Pending: 0", font=("Arial", 10))
        self.pending_label.pack(side=tk.LEFT, padx=20)
        
        self.processing_label = ttk.Label(stats_inner, text="Processing: 0", font=("Arial", 10))
        self.processing_label.pack(side=tk.LEFT, padx=20)
        
        self.completed_label = ttk.Label(stats_inner, text="Completed: 0", font=("Arial", 10))
        self.completed_label.pack(side=tk.LEFT, padx=20)
        
        self.failed_label = ttk.Label(stats_inner, text="Failed: 0", font=("Arial", 10))
        self.failed_label.pack(side=tk.LEFT, padx=20)
        
        # Recent jobs log
        log_frame = ttk.LabelFrame(self.root, text="Recent Jobs (Last 5)", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Create treeview with scrollbar
        scrollbar = ttk.Scrollbar(log_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        columns = ("ID", "Type", "Status", "Created", "Completed")
        self.jobs_tree = ttk.Treeview(log_frame, columns=columns, height=10, 
                                       yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.jobs_tree.yview)
        
        self.jobs_tree.column("#0", width=0, stretch=tk.NO)
        self.jobs_tree.column("ID", width=40, anchor=tk.CENTER)
        self.jobs_tree.column("Type", width=80, anchor=tk.W)
        self.jobs_tree.column("Status", width=80, anchor=tk.W)
        self.jobs_tree.column("Created", width=150, anchor=tk.W)
        self.jobs_tree.column("Completed", width=150, anchor=tk.W)
        
        self.jobs_tree.heading("#0", text="", anchor=tk.W)
        self.jobs_tree.heading("ID", text="ID", anchor=tk.W)
        self.jobs_tree.heading("Type", text="Type", anchor=tk.W)
        self.jobs_tree.heading("Status", text="Status", anchor=tk.W)
        self.jobs_tree.heading("Created", text="Created", anchor=tk.W)
        self.jobs_tree.heading("Completed", text="Completed", anchor=tk.W)
        
        self.jobs_tree.pack(fill=tk.BOTH, expand=True)
        
        # Footer
        footer_frame = ttk.Frame(self.root)
        footer_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.info_label = ttk.Label(footer_frame, text="Ready", foreground="gray")
        self.info_label.pack(anchor=tk.W)
    
    def start_worker(self):
        """Start the queue worker process."""
        try:
            python_exe = Path(__file__).parent / ".venv" / "Scripts" / "python.exe"
            
            if not python_exe.exists():
                messagebox.showerror("Error", f"Python executable not found at:\n{python_exe}")
                return
            
            self.worker_process = subprocess.Popen(
                [str(python_exe), str(WORKER_SCRIPT), "--verbose"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            self.is_worker_running = True
            self.start_btn.config(state=tk.DISABLED)
            self.stop_btn.config(state=tk.NORMAL)
            
            self.worker_status_label.config(text="Queue Worker: ▶ Running", foreground="green")
            self.info_label.config(text=f"Queue worker started (PID: {self.worker_process.pid})")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start queue worker:\n{str(e)}")
    
    def stop_worker(self):
        """Stop the queue worker process."""
        if self.worker_process:
            try:
                self.worker_process.terminate()
                self.worker_process.wait(timeout=5)
                self.is_worker_running = False
                
                self.start_btn.config(state=tk.NORMAL)
                self.stop_btn.config(state=tk.DISABLED)
                
                self.worker_status_label.config(text="Queue Worker: Stopped", foreground="red")
                self.info_label.config(text="Queue worker stopped")
                
            except subprocess.TimeoutExpired:
                self.worker_process.kill()
                self.is_worker_running = False
                messagebox.showwarning("Warning", "Queue worker killed (didn't stop gracefully)")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to stop queue worker:\n{str(e)}")
    
    def check_flask_server(self):
        """Check if Flask server is running."""
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('127.0.0.1', 8000))
            sock.close()
            return result == 0
        except:
            return False
    
    def refresh_stats(self):
        """Refresh queue statistics from database."""
        try:
            if not DB_PATH.exists():
                self.pending_label.config(text="Pending: ?")
                return
            
            conn = sqlite3.connect(str(DB_PATH))
            c = conn.cursor()
            
            # Get job counts
            c.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='pending'")
            pending = c.fetchone()[0]
            
            c.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='processing'")
            processing = c.fetchone()[0]
            
            c.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='completed'")
            completed = c.fetchone()[0]
            
            c.execute("SELECT COUNT(*) FROM statblock_jobs WHERE status='failed'")
            failed = c.fetchone()[0]
            
            self.pending_label.config(text=f"Pending: {pending}")
            self.processing_label.config(text=f"Processing: {processing}")
            self.completed_label.config(text=f"Completed: {completed}")
            self.failed_label.config(text=f"Failed: {failed}")
            
            # Get recent jobs
            c.execute("""
                SELECT id, job_type, status, created_at, completed_at 
                FROM statblock_jobs 
                ORDER BY id DESC 
                LIMIT 5
            """)
            
            jobs = c.fetchall()
            
            # Clear tree
            for item in self.jobs_tree.get_children():
                self.jobs_tree.delete(item)
            
            # Add jobs to tree
            for job in jobs:
                job_id, job_type, status, created_at, completed_at = job
                
                # Color based on status
                tags = ()
                if status == "completed":
                    tags = ("completed",)
                elif status == "failed":
                    tags = ("failed",)
                elif status == "processing":
                    tags = ("processing",)
                
                self.jobs_tree.insert("", tk.END, values=(
                    job_id,
                    job_type or "creature",
                    status,
                    created_at[:19] if created_at else "—",
                    completed_at[:19] if completed_at else "—"
                ), tags=tags)
            
            # Configure tag colors
            self.jobs_tree.tag_configure("completed", foreground="green")
            self.jobs_tree.tag_configure("failed", foreground="red")
            self.jobs_tree.tag_configure("processing", foreground="blue")
            
            conn.close()
            
        except Exception as e:
            self.info_label.config(text=f"Error refreshing stats: {str(e)}")
    
    def monitor_loop(self):
        """Background thread to monitor system status."""
        while True:
            try:
                # Check Flask server
                flask_running = self.check_flask_server()
                if flask_running:
                    self.flask_status_label.config(text="Flask Server: ✓ Running (port 8000)", 
                                                   foreground="green")
                else:
                    self.flask_status_label.config(text="Flask Server: ✗ Not running", 
                                                   foreground="red")
                
                # Check worker process
                if self.worker_process and self.worker_process.poll() is not None:
                    # Process has ended
                    self.is_worker_running = False
                    self.worker_status_label.config(text="Queue Worker: Stopped (crashed?)", 
                                                    foreground="red")
                    self.start_btn.config(state=tk.NORMAL)
                    self.stop_btn.config(state=tk.DISABLED)
                
                # Refresh stats
                self.refresh_stats()
                
                time.sleep(2)
                
            except Exception as e:
                print(f"Monitor error: {e}")
                time.sleep(5)


def main():
    root = tk.Tk()
    app = QueueMonitorGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
