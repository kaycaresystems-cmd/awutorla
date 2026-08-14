import React, { useState, useEffect } from 'react';
import {
  Scissors,
  CheckCircle2,
  Phone,
  Calendar,
  Layers,
  Sparkles,
  MessageCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Plus,
  AlertOctagon,
  Clock,
  Receipt,
  FileDown,
  Image as ImageIcon,
} from 'lucide-react';
import type { BespokeJobOrder, WorkshopStage, OrderTaskItem, TaskStatus, MeasurementParameter } from '../../types/workshop.types';
import { MeasurementSilhouette } from './MeasurementSilhouette';
import { formatWhatsAppStageMessage, formatWhatsAppInvoiceMessage, openWhatsAppChat } from '../../services/whatsapp';
import { RecordPaymentModal } from './RecordPaymentModal';
import { supabase } from '../../lib/supabase';
import { saveOfflineJobCard } from '../../lib/offlineStore';
import { fetchMeasurementParameters } from '../../lib/measurementParameters';
import { fetchAppSettings, DEFAULT_APP_SETTINGS } from '../../lib/settings';
import type { AppSettings } from '../../lib/settings';
import { downloadInvoicePdf, invoicePdfBlob } from '../../lib/invoice';
import { activeTabClass, inactiveTabClass } from '../ui/tabStyles';
import { uploadInvoicePdf } from '../../lib/storage';
import { useAuth } from '../../lib/auth';
import { Modal } from '../ui/Modal';

export function getNextStage(current: WorkshopStage): WorkshopStage {
  switch (current) {
    case 'pending':
      return 'cutting';
    case 'cutting':
      return 'fitting';
    case 'fitting':
      return 'finishing';
    case 'finishing':
      return 'ready';
    case 'ready':
      return 'delivered';
    default:
      return 'delivered';
  }
}

interface DigitalJobCardProps {
  order: BespokeJobOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: BespokeJobOrder) => void;
}

export const DigitalJobCard: React.FC<DigitalJobCardProps> = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'measurements' | 'tasks' | 'fabric' | 'history'>('measurements');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastNotification, setLastNotification] = useState<{
    stage: WorkshopStage;
    message: string;
  } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTailor, setNewTaskTailor] = useState('Master Kwame Mensah');
  const [measurementParameters, setMeasurementParameters] = useState<MeasurementParameter[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchMeasurementParameters()
      .then((params) => {
        if (isMounted) setMeasurementParameters(params);
      })
      .catch((err) => console.error('[DigitalJobCard] Failed to load measurement parameters:', err));
    fetchAppSettings()
      .then((settings) => {
        if (isMounted) setAppSettings(settings);
      })
      .catch((err) => console.error('[DigitalJobCard] Failed to load business settings:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Reset transient view state each time the card opens for a (possibly different) order
  useEffect(() => {
    if (isOpen && order) {
      setActiveTab('measurements');
      setIsAdvancing(false);
      setIsPaymentModalOpen(false);
      setLastNotification(null);
      setNewTaskTitle('');
      setNewTaskTailor(order.assignedTailor || 'Master Kwame Mensah');
      setIsSendingInvoice(false);
      setInvoiceError(null);
    }
  }, [order?.id, isOpen]);

  if (!isOpen || !order) return null;

  // Sub-tasks state
  const currentTasks = order.tasks || [];
  const nextStage = getNextStage(order.stage);
  const isFinalStage = order.stage === 'delivered' || order.stage === 'ready';
  const remainingBalance = Math.max(0, order.totalAmount - order.depositPaid);

  // Handle Sub-Task Status Toggle
  const handleToggleTaskStatus = async (taskId: string, currentStatus: TaskStatus) => {
    let nextStatus: TaskStatus = 'in_progress';
    if (currentStatus === 'pending') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress') nextStatus = 'completed';
    else if (currentStatus === 'completed') nextStatus = 'blocked';
    else if (currentStatus === 'blocked') nextStatus = 'pending';

    const updatedTasks = currentTasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
          }
        : t
    );

    const updatedOrder: BespokeJobOrder = {
      ...order,
      tasks: updatedTasks,
    };

    saveOfflineJobCard(updatedOrder);
    onOrderUpdated(updatedOrder);

    // Sync to Supabase
    try {
      const { error } = await (supabase.from('order_tasks') as any)
        .update({
          status: nextStatus,
          completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', taskId);
      if (error) console.error('[DigitalJobCard] Task update failed:', error);
    } catch (err) {
      console.error('[DigitalJobCard] Task update threw:', err);
    }
  };

  // Handle Add New Sub-Task
  const handleAddNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: OrderTaskItem = {
      id: `tsk-${Date.now().toString().slice(-4)}`,
      orderId: order.id,
      tailorName: newTaskTailor,
      title: newTaskTitle.trim(),
      status: 'pending',
      assignedAt: new Date().toISOString(),
    };

    const updatedTasks = [...currentTasks, newTask];
    const updatedOrder: BespokeJobOrder = {
      ...order,
      tasks: updatedTasks,
    };

    saveOfflineJobCard(updatedOrder);
    onOrderUpdated(updatedOrder);
    setNewTaskTitle('');

    // Sync to Supabase
    if (user) {
      try {
        const { error } = await (supabase.from('order_tasks') as any).insert({
          id: newTask.id,
          order_id: order.id,
          tailor_id: user.id,
          tailor_name: newTaskTailor,
          title: newTask.title,
          status: newTask.status,
        });
        if (error) console.error('[DigitalJobCard] Task insert failed:', error);
      } catch (err) {
        console.error('[DigitalJobCard] Task insert threw:', err);
      }
    }
  };

  // Handle Mark Stage Complete
  const handleMarkStageComplete = async () => {
    setIsAdvancing(true);
    setLastNotification(null);

    const targetStage = nextStage;
    const waMessage = formatWhatsAppStageMessage(order, targetStage);
    const updatedStageHistory = [
      ...order.stageHistory,
      {
        stage: targetStage,
        completedAt: new Date().toISOString(),
        completedBy: order.assignedTailor,
        notes: `Stage marked complete via shop-floor digital job card.`,
      },
    ];

    // 1. Update Supabase Database
    try {
      const { error } = await (supabase.from('orders') as any)
        .update({
          status: targetStage,
          stage_history: updatedStageHistory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
      if (error) console.error('[DigitalJobCard] Stage update failed:', error);
    } catch (err) {
      console.error('[DigitalJobCard] Stage update threw:', err);
    }

    // 2. Update local and offline cache
    const updated: BespokeJobOrder = {
      ...order,
      stage: targetStage,
      stageHistory: updatedStageHistory,
    };

    saveOfflineJobCard(updated);
    onOrderUpdated(updated);

    setLastNotification({
      stage: targetStage,
      message: waMessage,
    });
    setIsAdvancing(false);
  };

  const handleDownloadInvoice = () => {
    downloadInvoicePdf(order, appSettings);
  };

  // Uploads the generated invoice to storage and opens WhatsApp with a link to it —
  // wa.me deep links can only pre-fill text, not attach a file, so a shareable link
  // is the closest this app can get to "sending" the PDF itself.
  const handleSendInvoiceViaWhatsApp = async () => {
    setIsSendingInvoice(true);
    setInvoiceError(null);
    try {
      const blob = invoicePdfBlob(order, appSettings);
      const invoiceUrl = await uploadInvoicePdf(order.id, blob);
      const waMsg = formatWhatsAppInvoiceMessage(order, invoiceUrl);
      openWhatsAppChat(order.clientPhone, waMsg);
    } catch (err) {
      console.error('[DigitalJobCard] Invoice upload/share failed:', err);
      setInvoiceError('Could not upload the invoice for sharing. You can still download it directly.');
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'measurements', label: 'Measurements' },
    { id: 'tasks', label: `Tasks (${currentTasks.length})` },
    { id: 'fabric', label: 'Fabric & Specs' },
    { id: 'history', label: `History (${order.stageHistory.length})` },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={order.garmentTitle}
        subtitle={`Artisan Job Card // #${order.id}`}
        icon={<Scissors size={18} className="text-accent-800" />}
        maxWidth="max-w-5xl"
      >
        {/* Client, Financial, & Tailor Metadata Banner */}
        <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-200/80 flex flex-wrap justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Client</span>
              <span className="font-semibold text-accent-950 font-display text-sm">{order.clientName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 font-mono">
              <Phone size={12} className="text-gold-700" />
              <span>{order.clientPhone}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/90 px-3.5 py-2 rounded-xl border border-gold-500/25 shadow-sm">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Financial Balance</span>
              <span className="font-semibold text-gray-900 font-mono">
                Paid: GHS {order.depositPaid.toFixed(0)} / {order.totalAmount.toFixed(0)}
                {remainingBalance > 0 ? (
                  <span className="text-rose-600 font-semibold ml-1.5 font-sans">(Due: GHS {remainingBalance.toFixed(0)})</span>
                ) : (
                  <span className="text-emerald-700 font-semibold ml-1.5 font-sans">(Settled)</span>
                )}
              </span>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Receipt size={12} className="text-gold-300" />
              <span>Record</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadInvoice}
              title="Download invoice PDF"
              className="px-3 py-1.5 bg-white/90 hover:bg-white border border-gray-200 text-accent-900 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <FileDown size={12} className="text-gold-700" />
              <span>Invoice</span>
            </button>
            <button
              onClick={handleSendInvoiceViaWhatsApp}
              disabled={isSendingInvoice}
              title="Share invoice link via WhatsApp"
              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-60 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {isSendingInvoice ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
              <span>Send</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Master Artisan</span>
              <span className="font-semibold text-accent-950">{order.assignedTailor}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 font-mono">
              <Calendar size={12} className="text-gold-700" />
              <span>Due: {order.dueDate}</span>
            </div>
          </div>
        </div>

        {invoiceError && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertOctagon size={13} className="shrink-0" />
            <span>{invoiceError}</span>
          </div>
        )}

        {/* WhatsApp Notification Prompt Toast */}
        {lastNotification && (
          <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-start gap-2.5 flex-1 min-w-[240px]">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block">Stage advanced to {order.stage.toUpperCase()}</span>
                <p className="opacity-80">Ready to notify client with direct WhatsApp concierge tracking.</p>
              </div>
            </div>

            <button
              onClick={() => {
                const waMsg = formatWhatsAppStageMessage(order, lastNotification.stage);
                openWhatsAppChat(order.clientPhone, waMsg);
              }}
              className="px-4 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <MessageCircle size={14} />
              <span>Send WhatsApp Update</span>
            </button>
          </div>
        )}

        <div className="p-6 sm:p-7 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-gray-200/80 pb-2 overflow-x-auto scrollbar-none">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ${
                  activeTab === t.id ? `${activeTabClass} shadow-sm` : inactiveTabClass
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB: Measurements */}
          {activeTab === 'measurements' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <MeasurementSilhouette measurements={order.measurements} parameters={measurementParameters} />

              <div className="p-5 rounded-2xl bg-gradient-to-br from-gold-50/70 to-accent-50/50 border border-gold-500/25 text-sm shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-accent-900 font-semibold">
                  <ShieldCheck size={16} className="text-gold-700" />
                  <span className="font-display text-base">Atelier Master Specification</span>
                </div>
                <p className="text-gray-700 text-xs leading-relaxed">
                  Garment patterned with 1.5-inch side seam allowances for secondary client fitting adjustments. All measurements are precision synchronized with the client's master vault profile.
                </p>
              </div>
            </div>
          )}

          {/* TAB: Tasks */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-accent-950 font-display">Workshop Task Checklist</h3>
                <span className="text-xs text-gray-500 font-sans">
                  Granular tracking for pattern drafting, cutting, boning, and hand-finishing.
                </span>
              </div>

              <div className="space-y-2.5">
                {currentTasks.length === 0 ? (
                  <div className="p-8 text-center glass rounded-2xl text-xs text-gray-500">
                    No tasks defined for this order yet. Add artisan sub-tasks below.
                  </div>
                ) : (
                  currentTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all duration-150 ${
                        t.status === 'completed'
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : t.status === 'in_progress'
                          ? 'bg-gold-50/80 border-gold-300 text-gold-950 shadow-sm'
                          : t.status === 'blocked'
                          ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                          : 'bg-white/70 border-gray-200 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <button onClick={() => handleToggleTaskStatus(t.id, t.status)} className="mt-0.5">
                          {t.status === 'completed' ? (
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                          ) : t.status === 'in_progress' ? (
                            <Clock size={18} className="text-gold-700 shrink-0" />
                          ) : t.status === 'blocked' ? (
                            <AlertOctagon size={18} className="text-rose-600 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 hover:border-accent-600" />
                          )}
                        </button>
                        <div>
                          <span className={`text-sm font-semibold ${t.status === 'completed' ? 'line-through opacity-70' : ''}`}>
                            {t.title}
                          </span>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span>Artisan: {t.tailorName}</span>
                            {t.completedAt && (
                              <span className="text-emerald-700 font-medium font-mono">
                                Completed {new Date(t.completedAt).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleTaskStatus(t.id, t.status)}
                        className="px-3 py-1 rounded-xl border border-gray-200 bg-white/80 text-[11px] font-semibold text-gray-700 capitalize shadow-sm"
                      >
                        {t.status.replace('_', ' ')}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddNewTask} className="p-5 glass rounded-2xl space-y-3 border border-gold-500/20">
                <span className="text-xs font-semibold text-accent-900 block uppercase tracking-wider">Add Artisan Sub-Task</span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Cut interior silk lining & sew boning channels"
                    className="sm:col-span-7 bg-white/90 p-2.5 text-xs text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/30 border border-gray-200"
                  />
                  <select
                    value={newTaskTailor}
                    onChange={(e) => setNewTaskTailor(e.target.value)}
                    className="sm:col-span-3 bg-white/90 p-2.5 text-xs text-gray-900 rounded-xl focus:outline-none border border-gray-200"
                  >
                    <option value="Master Kwame Mensah">Master Kwame Mensah</option>
                    <option value="Artisan Kofi Badu">Artisan Kofi Badu</option>
                    <option value="Artisan Ama Frimpong">Artisan Ama Frimpong</option>
                  </select>
                  <button
                    type="submit"
                    className="sm:col-span-2 bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white p-2.5 font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1"
                  >
                    <Plus size={14} className="text-gold-300" />
                    <span>Add Task</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: Fabric & References */}
          {activeTab === 'fabric' && (
            <div className="space-y-6">
              {order.referenceImages.length === 0 ? (
                <div className="p-8 text-center glass rounded-2xl border border-gray-200/80 text-xs text-gray-500 flex flex-col items-center gap-2">
                  <ImageIcon size={22} className="text-gray-300" />
                  <span>No reference sketches or photos were uploaded for this order.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {order.referenceImages.map((img, idx) => (
                    <a
                      key={idx}
                      href={img}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-64 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm block"
                    >
                      <img src={img} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}

              <div className="p-6 glass rounded-2xl space-y-3 text-sm border border-gold-500/20 shadow-sm">
                <div className="flex items-center gap-2 text-accent-800 font-semibold font-display text-base">
                  <Layers size={16} className="text-gold-700" />
                  <span>Textile Specification</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-gray-400 block text-xs uppercase tracking-wider">Fabric Weave</span>
                    <span className="font-semibold text-accent-950">{order.fabricType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-xs uppercase tracking-wider">Color Palette</span>
                    <span className="font-semibold text-accent-950">{order.fabricColor}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200/80">
                  <span className="text-gray-400 block text-xs uppercase tracking-wider mb-1">Artisan Tailoring Notes</span>
                  <p className="text-gray-700 leading-relaxed text-xs">{order.fabricNotes}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: History */}
          {activeTab === 'history' && (
            <div className="relative pl-6 border-l-2 border-gold-500/30 space-y-4">
              {order.stageHistory.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-accent-800 border-2 border-gold-400 shadow-sm" />
                  <div className="p-4 glass rounded-2xl space-y-1 border border-gray-200/80">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-accent-900 text-xs uppercase tracking-wider">{item.stage}</span>
                      <span className="text-gray-400 text-xs font-mono">
                        {item.completedAt ? new Date(item.completedAt).toLocaleTimeString() : 'In Progress'}
                      </span>
                    </div>
                    <p className="text-gray-700 text-xs">{item.notes}</p>
                    {item.completedBy && <span className="text-[11px] text-gray-400 block font-sans">By {item.completedBy}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-6 bg-white/90 border-t border-gray-200/80 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest block">Current Production Stage</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-lg font-bold capitalize text-accent-950 font-display">{order.stage}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isFinalStage ? (
              <button
                disabled={isAdvancing}
                onClick={handleMarkStageComplete}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-md ${
                  isAdvancing
                    ? 'bg-gray-200 text-gray-400 cursor-wait'
                    : 'bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white shadow-accent-900/20'
                }`}
              >
                {isAdvancing ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-gold-300" />
                    <span>Updating Stage...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} className="text-gold-300" />
                    <span>Advance to {nextStage}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            ) : (
              <div className="px-5 py-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm">
                <Sparkles size={16} className="text-emerald-600" />
                <span>Garment Completed / Ready for Delivery</span>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Record Payment Sub-Modal */}
      <RecordPaymentModal
        order={order}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentRecorded={(updated) => {
          onOrderUpdated(updated);
        }}
      />
    </>
  );
};

export default DigitalJobCard;
