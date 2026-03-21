'use client';

import { useState } from 'react';
import { CheckCircle, Upload, ExternalLink } from 'lucide-react';

export default function SupportPage() {
  const [department, setDepartment] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setSubject('');
    setMessage('');
    setPriority('medium');
    setDepartment('general');
    setTimeout(() => setSubmitted(false), 6000);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Support</h1>
      <p className="text-sm text-gray-500 mb-8">Get help from the Envosta team</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit a Request */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Submit a Request</h2>

            {submitted && (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">
                  Your request has been submitted. We typically respond within 24 hours.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Department</label>
                <select
                  className="input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="general">General Support</option>
                </select>
              </div>

              <div>
                <label className="label">Subject</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="Brief summary of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Message</label>
                <textarea
                  className="input"
                  rows={4}
                  required
                  placeholder="Describe your issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Priority</label>
                <select
                  className="input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Attachment placeholder */}
              <div>
                <label className="label">Attachments</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Drag & drop files here, or{' '}
                    <span className="text-brand-600 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 10 MB</p>
                </div>
              </div>

              <button type="submit" className="btn-primary">
                Submit Request
              </button>
            </form>
          </div>
        </div>

        {/* Envosta Studio promo */}
        <div className="lg:col-span-1">
          <div className="relative rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/60 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Need a custom website?</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Our studio team designs and builds high-performance websites tailored to your brand. From concept to launch, we handle everything.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="badge-indigo">Custom Design</span>
              <span className="badge-indigo">SEO Optimized</span>
              <span className="badge-indigo">Launch in 5 Days</span>
            </div>
            <a
              href="https://envosta.com/studio"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex"
            >
              Learn More <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
