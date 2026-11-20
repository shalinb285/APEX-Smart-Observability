import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  History,
  Send,
  User,
  GitCommit,
  ShieldAlert,
} from 'lucide-react';
import { IncidentItem, IncidentStatus, IncidentSeverity } from '../types';
import { api } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { SearchInput } from '../components/ui/SearchInput';
import { Modal } from '../components/ui/Modal';
import { useMonitoring } from '../context/MonitoringContext';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [assigneeInput, setAssigneeInput] = useState('');
  const { showNotification } = useMonitoring();

  useEffect(() => {
    const fetchIncidents = async () => {
      setLoading(true);
      try {
        const data = await api.getIncidents();
        setIncidents(data);
        if (data.length > 0) setSelectedIncident(data[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  const handleStatusChange = async (incidentId: string, newStatus: IncidentStatus) => {
    try {
      const updated = await api.updateIncident(incidentId, { currentStatus: newStatus });
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedIncident(updated);
      showNotification(`Incident ${incidentId} status updated to ${newStatus}`, 'success');
    } catch (e) {
      showNotification('Failed to update incident status', 'error');
    }
  };

  const handleAssign = async (incidentId: string, assigneeName: string) => {
    if (!assigneeName.trim()) return;
    try {
      const updated = await api.updateIncident(incidentId, { assignee: assigneeName.trim() });
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedIncident(updated);
      setAssigneeInput('');
      showNotification(`Assigned ${incidentId} to ${assigneeName.trim()}`, 'success');
    } catch (e) {
      showNotification('Failed to update assignee', 'error');
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedIncident) return;

    const newNote = {
      id: `note-${Date.now()}`,
      author: 'Current User (SRE Lead)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: newNoteText.trim(),
    };

    const newTimelineEvent = {
      timestamp: newNote.timestamp,
      event: `Investigation note added: "${newNoteText.trim().slice(0, 45)}..."`,
      actor: 'Current User',
      type: 'comment' as const,
    };

    const updatedIncident: IncidentItem = {
      ...selectedIncident,
      notes: [...selectedIncident.notes, newNote],
      timeline: [...selectedIncident.timeline, newTimelineEvent],
    };

    setIncidents((prev) => prev.map((i) => (i.id === updatedIncident.id ? updatedIncident : i)));
    setSelectedIncident(updatedIncident);
    setNewNoteText('');
    showNotification('Diagnostic note appended to timeline', 'info');
  };

  const filteredIncidents = incidents.filter(
    (i) =>
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.affectedService.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-white" />
            INCIDENT RESPONSE &amp; WAR ROOM
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time incident command, root cause identification, and mitigation audit log
          </p>
        </div>

        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
          placeholder="Filter incidents..."
          className="w-full sm:w-72"
        />
      </div>

      {/* 2-Column Split: Master Incident List on Left (5 cols) & Detail Commander on Right (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Incidents List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredIncidents.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            const isCrit = inc.severity.includes('P1');

            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`p-4 rounded-xl border transition-all cursor-pointer font-mono select-none text-xs ${
                  isSelected
                    ? 'bg-zinc-900 border-white shadow-glow-white'
                    : 'bg-[#09090B] border-zinc-800 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{inc.id}</span>
                    <Badge variant={isCrit ? 'critical' : 'warning'}>{inc.severity}</Badge>
                  </div>
                  <StatusPill status={inc.currentStatus} className="text-[10px]" />
                </div>

                <h4 className="text-sm font-bold text-white mb-1 leading-snug">{inc.title}</h4>

                <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-zinc-200">SVC: {inc.affectedService}</span>
                  <span>Assignee: {inc.assignee}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Incident War Room Commander */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <Card className="space-y-5">
              {/* Incident Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-white">
                      {selectedIncident.id}
                    </span>
                    <Badge variant={selectedIncident.severity.includes('P1') ? 'critical' : 'warning'}>
                      {selectedIncident.severity}
                    </Badge>
                    <span className="text-xs font-mono text-zinc-400">
                      Detected: {selectedIncident.detectionTime}
                    </span>
                  </div>
                  <h3 className="text-base font-bold font-mono text-white">
                    {selectedIncident.title}
                  </h3>
                </div>

                {/* Status Switcher Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500">STATUS:</span>
                  <select
                    value={selectedIncident.currentStatus}
                    onChange={(e) => handleStatusChange(selectedIncident.id, e.target.value as any)}
                    className="bg-black border border-zinc-700 text-xs font-mono text-white rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="investigating">INVESTIGATING</option>
                    <option value="identified">IDENTIFIED</option>
                    <option value="monitoring">MONITORING</option>
                    <option value="resolved">RESOLVED</option>
                  </select>
                </div>
              </div>

              {/* Assignment Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-black border border-zinc-800 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-white" />
                  <span className="text-zinc-400">Incident Commander:</span>
                  <span className="font-bold text-white">{selectedIncident.assignee}</span>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input
                    type="text"
                    value={assigneeInput}
                    onChange={(e) => setAssigneeInput(e.target.value)}
                    placeholder="Reassign user..."
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none w-full sm:w-36"
                  />
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => handleAssign(selectedIncident.id, assigneeInput)}
                  >
                    ASSIGN
                  </Button>
                </div>
              </div>

              {/* Root Cause & Resolution Cards */}
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-300 font-bold tracking-wider">
                    Identified Root Cause
                  </span>
                  <p className="text-zinc-200 leading-relaxed">{selectedIncident.rootCause}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase text-white font-bold tracking-wider">
                    Remediation / Resolution Strategy
                  </span>
                  <p className="text-zinc-200 leading-relaxed">{selectedIncident.resolutionDetails}</p>
                </div>
              </div>

              {/* Incident Timeline */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-300">
                  <History className="w-4 h-4 text-white" />
                  Incident Event Chronology
                </div>

                <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800 font-mono text-xs">
                  {selectedIncident.timeline.map((evt, i) => (
                    <div key={i} className="relative group">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-white ring-4 ring-black" />
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span>{evt.timestamp}</span>
                        <span>•</span>
                        <span className="text-zinc-300 font-semibold">{evt.actor}</span>
                      </div>
                      <p className="text-xs text-zinc-200 mt-0.5">{evt.event}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investigation Notes & Triage Log */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-300">
                  <MessageSquare className="w-4 h-4 text-white" />
                  Investigation Notes ({selectedIncident.notes.length})
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedIncident.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg bg-black border border-zinc-800 font-mono text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-semibold text-white">{note.author}</span>
                        <span>{note.timestamp}</span>
                      </div>
                      <p className="text-zinc-200 leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Input Form */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add diagnostic finding or action note..."
                    className="flex-1 px-3 py-2 bg-black border border-zinc-700 rounded-lg text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    POST NOTE
                  </Button>
                </form>
              </div>
            </Card>
          ) : (
            <Card className="text-center p-12">
              <p className="text-xs font-mono text-zinc-400">Select an incident to view war room diagnostics.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
