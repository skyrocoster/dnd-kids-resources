/**
 * Reusable queue submission helper for spell and creature parsers
 * Handles job submission and polling
 */

class QueueHelper {
    constructor(options = {}) {
        this.contentType = options.contentType || 'creature'; // 'creature' or 'spell'
        this.statusElement = options.statusElement;
        this.contentInput = options.contentInput;
        this.submitBtn = options.submitBtn;
        this.clearBtn = options.clearBtn;
        
        this.currentJobId = null;
        this.pollIntervalId = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        if (this.submitBtn) {
            this.submitBtn.addEventListener('click', () => this.submitToQueue());
        }
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clear());
        }
    }
    
    setContentType(type) {
        this.contentType = type; // 'creature' or 'spell'
    }
    
    async submitToQueue() {
        const contentValue = (this.contentInput?.value || '').trim();
        
        if (!contentValue) {
            this.showStatus(
                `Please paste a ${this.contentType === 'creature' ? 'stat block' : 'spell description'}`,
                'error'
            );
            return;
        }

        this.showStatus('Submitting to queue...', 'loading');

        try {
            const payload = {
                statblock: contentValue,
                job_type: this.contentType
            };

            // Submit job to queue
            const response = await fetch('/api/queue/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success && data.job_id) {
                this.currentJobId = data.job_id;
                this.showStatus(`✓ Job #${this.currentJobId} queued (${this.contentType})`, 'loading');
                
                // Clear form for next job
                if (this.contentInput) {
                    this.contentInput.value = '';
                    this.contentInput.focus();
                }
                
                // Start polling
                this.startPolling();
            } else {
                this.showStatus(data.error || 'Failed to submit job', 'error');
            }
        } catch (error) {
            this.showStatus(`Error: ${error.message}`, 'error');
        }
    }

    showStatus(message, type) {
        if (!this.statusElement) return;
        
        this.statusElement.textContent = message;
        this.statusElement.className = `queue-status-message ${type}`;
        this.statusElement.classList.add('show');
    }

    startPolling() {
        // Poll job status every 2 seconds
        this.pollIntervalId = setInterval(() => this.pollJobStatus(), 2000);
        // Also poll immediately
        this.pollJobStatus();
    }

    async pollJobStatus() {
        if (!this.currentJobId) return;

        try {
            const response = await fetch(`/api/queue/${this.currentJobId}`);
            const job = await response.json();

            if (job.error) {
                this.showStatus(`Job #${this.currentJobId} not found: ${job.error}`, 'error');
                if (this.pollIntervalId) clearInterval(this.pollIntervalId);
                return;
            }

            // Update status
            let statusText = `[Job #${this.currentJobId}] `;
            let statusType = 'loading';

            switch (job.status) {
                case 'pending':
                    statusText += `⏳ Pending (in queue...)`;
                    break;
                case 'processing':
                    const progress = job.progress_percent || 0;
                    statusText += `⚙️ Processing... ${progress}%`;
                    break;
                case 'completed':
                    const resourceType = job.job_type === 'spell' ? 'spell' : 'creature';
                    const resourceId = job.job_type === 'spell' ? job.spell_id : job.creature_id;
                    
                    if (resourceId) {
                        statusText += `✓ Complete! ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} #${resourceId} saved`;
                        statusType = 'success';
                    } else {
                        statusText += `✓ Parsing complete (no ${resourceType} created)`;
                        statusType = 'success';
                    }
                    
                    // Stop polling
                    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
                    this.currentJobId = null;
                    break;
                
                case 'failed':
                    statusText += `✗ Failed: ${job.error_message || 'Unknown error'}`;
                    statusType = 'error';
                    if (this.pollIntervalId) clearInterval(this.pollIntervalId);
                    this.currentJobId = null;
                    break;
            }

            this.showStatus(statusText, statusType);

        } catch (error) {
            console.error('Poll error:', error);
            // Don't show error for network issues, just keep polling
        }
    }

    clear() {
        if (this.contentInput) {
            this.contentInput.value = '';
            this.contentInput.focus();
        }
        if (this.statusElement) {
            this.statusElement.textContent = '';
        }
    }
}
