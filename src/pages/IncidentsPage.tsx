import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Flame,
  History,
  MessageSquare,
  Send,
  User,
  RefreshCw,
  Search,
  AlertTriangle,
} from 'lucide-react';
import type { IncidentItem, IncidentStatus } from '../types';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusPill } from '../components/ui/StatusPill';
import { useMonitoring } from '../context/MonitoringContext';

/**
 * The backend may return an array directly or wrap it in an envelope.
 * This helper extracts only actual arrays and never trusts an unknown value.
 */
const extractArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidates = [
      record.incidents,
      record.items,
      record.results,
      record.data,
      record.records,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;

      if (candidate && typeof candidate === 'object') {
        const nested = extractArray(candidate);
        if (nested.length > 0) return nested;
      }
    }
  }

  return [];
};

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : fallback;

const normalizeIncident = (value: unknown, index: number): IncidentItem | null => {
  if (!value || typeof value !== 'object') return null;

  const item = value as Record<string, unknown>;
  const id = asText(item.id ?? item.incident_id ?? item.incidentId, `INC-${index + 1}`);
  const severity = asText(item.severity ?? item.priority, 'P3') as IncidentItem['severity'];
  const status = asText(
    item.currentStatus ?? item.current_status ?? item.status,
    'investigating',
  ) as IncidentStatus;

  const rawNotes = extractArray(item.notes);
  const rawTimeline = extractArray(item.timeline);

  const notes = rawNotes
    .filter((note): note is Record<string, unknown> => !!note && typeof note === 'object')
    .map((note, noteIndex) => ({
      id: asText(note.id, `note-${index}-${noteIndex}`),
      author: asText(note.author, 'System'),
      timestamp: asText(note.timestamp, ''),
      text: asText(note.text ?? note.message, ''),
    }));

  const timeline = rawTimeline
    .filter((event): event is Record<string, unknown> => !!event && typeof event === 'object')
    .map((event) => ({
      timestamp: asText(event.timestamp, ''),
      event: asText(event.event ?? event.message, 'Incident event'),
      actor: asText(event.actor, 'System'),
      type: asText(event.type, 'update') as 'comment',
    }));

  return {
    ...(item as unknown as IncidentItem),
    id,
    title: asText(item.title ?? item.name, 'Untitled incident'),
    severity,
    currentStatus: status,
    affectedService: asText(item.affectedService ?? item.affected_service ?? item.service, 'Unknown service'),
    assignee: asText(item.assignee ?? item.assigned_to, 'Unassigned'),
    detectionTime: asText(item.detectionTime ?? item.detection_time ?? item.created_at, 'Unknown'),
    rootCause: asText(item.rootCause ?? item.root_cause, 'Root cause not yet identified.'),
    resolutionDetails: asText(
      item.resolutionDetails ?? item.resolution_details,
      'No remediation details have been recorded.',
    ),
    notes,
    timeline,
  } as IncidentItem;
};

const normalizeIncidentList = (value: unknown): IncidentItem[] =>
  extractArray(value)
    .map((item, index) => normalizeIncident(item, index))
    .filter((item): item is IncidentItem => item !== null);

const normalizeUpdatedIncident = (
  value: unknown,
  fallback: IncidentItem,
): IncidentItem => {
  const extracted = normalizeIncident(value, 0);
  if (extracted) {
    return {
      ...fallback,
      ...extracted,
      notes: Array.isArray(extracted.notes) ? extracted.notes : fallback.notes,
      timeline: Array.isArray(extracted.timeline) ? extracted.timeline : fallback.timeline,
    };
  }

  // Some API implementations return an envelope rather than the updated item.
  const candidates = extractArray(value);
  if (candidates.length > 0) {
    const matching = candidates.find((candidate) => {
      if (!candidate || typeof candidate !== 'object') return false;
      return asText((candidate as Record<string, unknown>).id) === fallback.id;
    });
    const match = normalizeIncident(matching, 0);
    if (match) return { ...fallback, ...match };
  }

  return fallback;
};

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [assigneeInput, setAssigneeInput] = useState('');
  const [saving, setSaving] = useState(false);
  const { showNotification } = useMonitoring();

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response: unknown = await api.getIncidents();
      const safeIncidents = normalizeIncidentList(response);

      setIncidents(safeIncidents);
      setSelectedIncident((current) => {
        if (!current) return safeIncidents[0] ?? null;
        return safeIncidents.find((incident) => incident.id === current.id) ?? safeIncidents[0] ?? null;
      });

      if (safeIncidents.length === 0) {
        setLoadError('No incidents were returned by the API.');
      }
    } catch (error) {
      console.error('Failed to load incidents:', error);
      setIncidents([]);
      setSelectedIncident(null);
      setLoadError('Unable to load incidents. Check the backend API connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchIncidents();
  }, [fetchIncidents]);

  const updateLocalIncident = (updated: IncidentItem) => {
    setIncidents((previous) =>
      previous.map((incident) => (incident.id === updated.id ? updated : incident)),
    );
    setSelectedIncident(updated);
  };

  const handleStatusChange = async (incidentId: string, newStatus: IncidentStatus) => {
    const current = incidents.find((incident) => incident.id === incidentId);
    if (!current) return;

    setSaving(true);
    try {
      const response: unknown = await api.updateIncident(incidentId, {
        currentStatus: newStatus,
      });
      const updated = normalizeUpdatedIncident(response, {
        ...current,
        currentStatus: newStatus,
      });
      updateLocalIncident(updated);
      showNotification(`Incident ${incidentId} status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error('Incident status update failed:', error);
      showNotification('Failed to update incident status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (incidentId: string) => {
    const assignee = assigneeInput.trim();
    const current = incidents.find((incident) => incident.id === incidentId);
    if (!assignee || !current) return;

    setSaving(true);
    try {
      const response: unknown = await api.updateIncident(incidentId, { assignee });
      const updated = normalizeUpdatedIncident(response, {
        ...current,
        assignee,
      });
      updateLocalIncident(updated);
      setAssigneeInput('');
      showNotification(`Assigned ${incidentId} to ${assignee}`, 'success');
    } catch (error) {
      console.error('Incident assignment failed:', error);
      showNotification('Failed to update assignee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = newNoteText.trim();
    if (!text || !selectedIncident) return;

    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const updatedIncident: IncidentItem = {
      ...selectedIncident,
      notes: [
        ...(Array.isArray(selectedIncident.notes) ? selectedIncident.notes : []),
        {
          id: `note-${Date.now()}`,
          author: 'Current User (SRE Lead)',
          timestamp,
          text,
        },
      ],
      timeline: [
        ...(Array.isArray(selectedIncident.timeline) ? selectedIncident.timeline : []),
        {
          timestamp,
          event: `Investigation note added: "${text.slice(0, 45)}${text.length > 45 ? '...' : ''}"`,
          actor: 'Current User',
          type: 'comment',
        },
      ],
    };

    updateLocalIncident(updatedIncident);
    setNewNoteText('');
    showNotification('Diagnostic note appended to the incident timeline', 'success');
  };

  const filteredIncidents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return incidents;

    return incidents.filter((incident) => {
      const title = asText(incident.title).toLowerCase();
      const id = asText(incident.id).toLowerCase();
      const service = asText(incident.affectedService).toLowerCase();
      const assignee = asText(incident.assignee).toLowerCase();

      return (
        title.includes(query) ||
        id.includes(query) ||
        service.includes(query) ||
        assignee.includes(query)
      );
    });
  }, [incidents, searchTerm]);

  const isCritical = (severity: string) =>
    severity.toUpperCase().includes('P1') || severity.toUpperCase().includes('CRITICAL');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold font-mono tracking-tight text-white">
            <Flame className="h-5 w-5 text-white" />
            INCIDENT RESPONSE &amp; WAR ROOM
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Incident command, root-cause investigation, and mitigation audit log
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search incidents..."
              className="w-full rounded-lg border border-zinc-800 bg-black py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-zinc-500"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => void fetchIncidents()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-zinc-300">INCIDENT QUEUE</span>
            <Badge variant="default">{filteredIncidents.length} incidents</Badge>
          </div>

          {loading ? (
            <Card className="p-6 text-center">
              <p className="text-xs font-mono text-zinc-400">Loading incident queue...</p>
            </Card>
          ) : loadError && incidents.length === 0 ? (
            <Card className="space-y-3 p-6 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-amber-400" />
              <p className="text-xs text-zinc-300">{loadError}</p>
              <Button variant="secondary" size="sm" onClick={() => void fetchIncidents()}>
                Try again
              </Button>
            </Card>
          ) : filteredIncidents.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-xs font-mono text-zinc-400">
                {searchTerm ? 'No incidents match your search.' : 'No active incidents.'}
              </p>
            </Card>
          ) : (
            filteredIncidents.map((incident) => {
              const selected = selectedIncident?.id === incident.id;
              const critical = isCritical(asText(incident.severity));

              return (
                <button
                  type="button"
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className={`w-full rounded-xl border p-4 text-left font-mono text-xs transition-colors ${
                    selected
                      ? 'border-white bg-zinc-900 shadow-glow-white'
                      : 'border-zinc-800 bg-[#09090B] hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{incident.id}</span>
                      <Badge variant={critical ? 'critical' : 'warning'}>
                        {incident.severity}
                      </Badge>
                    </div>
                    <StatusPill status={incident.currentStatus} className="text-[10px]" />
                  </div>
                  <h3 className="mb-2 text-sm font-bold leading-snug text-white">
                    {incident.title}
                  </h3>
                  <div className="flex flex-wrap justify-between gap-2 border-t border-zinc-800 pt-2 text-[11px] text-zinc-400">
                    <span className="text-zinc-200">SVC: {incident.affectedService}</span>
                    <span>Assignee: {incident.assignee || 'Unassigned'}</span>
                  </div>
                </button>
              );
            })
          )}
        </section>

        <section className="lg:col-span-7">
          {selectedIncident ? (
            <Card className="space-y-5">
              <div className="flex flex-col justify-between gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">
                      {selectedIncident.id}
                    </span>
                    <Badge variant={isCritical(asText(selectedIncident.severity)) ? 'critical' : 'warning'}>
                      {selectedIncident.severity}
                    </Badge>
                    <span className="font-mono text-xs text-zinc-400">
                      Detected: {selectedIncident.detectionTime}
                    </span>
                  </div>
                  <h3 className="font-mono text-base font-bold text-white">
                    {selectedIncident.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">STATUS:</span>
                  <select
                    value={selectedIncident.currentStatus}
                    disabled={saving}
                    onChange={(event) =>
                      void handleStatusChange(
                        selectedIncident.id,
                        event.target.value as IncidentStatus,
                      )
                    }
                    className="cursor-pointer rounded-lg border border-zinc-700 bg-black px-2.5 py-1.5 font-mono text-xs text-white outline-none"
                  >
                    <option value="investigating">INVESTIGATING</option>
                    <option value="identified">IDENTIFIED</option>
                    <option value="monitoring">MONITORING</option>
                    <option value="resolved">RESOLVED</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-lg border border-zinc-800 bg-black p-3 text-xs sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-white" />
                  <span className="text-zinc-400">Incident Commander:</span>
                  <span className="font-bold text-white">
                    {selectedIncident.assignee || 'Unassigned'}
                  </span>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <input
                    value={assigneeInput}
                    onChange={(event) => setAssigneeInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleAssign(selectedIncident.id);
                      }
                    }}
                    placeholder="Reassign user..."
                    className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white outline-none sm:w-36"
                  />
                  <Button
                    variant="primary"
                    size="xs"
                    disabled={saving || !assigneeInput.trim()}
                    onClick={() => void handleAssign(selectedIncident.id)}
                  >
                    ASSIGN
                  </Button>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-950 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                    Identified Root Cause
                  </span>
                  <p className="leading-relaxed text-zinc-200">
                    {selectedIncident.rootCause || 'Root cause not yet identified.'}
                  </p>
                </div>
                <div className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-950 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                    Remediation / Resolution Strategy
                  </span>
                  <p className="leading-relaxed text-zinc-200">
                    {selectedIncident.resolutionDetails || 'No remediation details recorded.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-zinc-300">
                  <History className="h-4 w-4 text-white" />
                  Incident Event Chronology
                </div>
                <div className="relative space-y-3 pl-6 font-mono text-xs before:absolute before:bottom-2 before:left-2 before:top-2 before:w-[2px] before:bg-zinc-800">
                  {(Array.isArray(selectedIncident.timeline) ? selectedIncident.timeline : []).length === 0 ? (
                    <p className="text-zinc-500">No timeline events recorded.</p>
                  ) : (
                    selectedIncident.timeline.map((event, index) => (
                      <div key={`${event.timestamp}-${index}`} className="group relative">
                        <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-white ring-4 ring-black" />
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                          <span>{event.timestamp}</span>
                          <span>•</span>
                          <span className="font-semibold text-zinc-300">{event.actor}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-200">{event.event}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t border-zinc-800 pt-3">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-zinc-300">
                  <MessageSquare className="h-4 w-4 text-white" />
                  Investigation Notes ({Array.isArray(selectedIncident.notes) ? selectedIncident.notes.length : 0})
                </div>

                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {(Array.isArray(selectedIncident.notes) ? selectedIncident.notes : []).map((note) => (
                    <div
                      key={note.id}
                      className="space-y-1 rounded-lg border border-zinc-800 bg-black p-3 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                        <span className="font-semibold text-white">{note.author}</span>
                        <span>{note.timestamp}</span>
                      </div>
                      <p className="leading-relaxed text-zinc-200">{note.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    value={newNoteText}
                    onChange={(event) => setNewNoteText(event.target.value)}
                    placeholder="Add diagnostic finding or action note..."
                    className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 font-mono text-xs text-white outline-none focus:border-white"
                  />
                  <Button type="submit" variant="primary" size="sm" disabled={!newNoteText.trim()}>
                    <Send className="h-3.5 w-3.5" />
                    POST NOTE
                  </Button>
                </form>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <p className="font-mono text-xs text-zinc-400">
                {loading ? 'Loading incident details...' : 'Select an incident to view war-room diagnostics.'}
              </p>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
};

export default IncidentsPage;
