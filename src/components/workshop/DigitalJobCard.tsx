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
} from 'lucide-react';
import type { BespokeJobOrder, WorkshopStage, OrderTaskItem, TaskStatus, MeasurementParameter } from '../../types/workshop.types';
import { MeasurementSilhouette } from './MeasurementSilhouette';
import { formatWhatsAppStageMessage, openWhatsAppChat } from '../../services/whatsapp';
import { RecordPaymentModal } from './RecordPaymentModal';
import { supabase } from '../../lib/supabase';
import { saveOfflineJobCard } from '../../lib/offlineStore';
import { fetchMeasurementParameters } from '../../lib/measurementParameters';
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

  useEffect(() => {
    let isMounted = true;
    fetchMeasurementParameters()
      .then((params) => {
        if (isMounted) setMeasurementParameters(params);
      })
      .catch((err) => console.error('[DigitalJobCard] Failed to load measurement parameters:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Reset transient view state each time the card opens for a (possibly different) order,
  // since the parent keeps this component mounted and only toggles `isOpen`.
  useEffect(() => {
    if (isOpen && order) {
      setActiveTab('measurements');
      setIsAdvancing(false);
      setIsPaymentModalOpen(false);
      setLastNotification(null);
      setNewTaskTitle('');
      setNewTaskTailor(order.assignedTailor || 'Master Kwame Mensah');
    }
  }, [order?.id, isOpen]);

  if (!isOpen || !order) return null;

  // Sub-tasks state
  const currentTasks = order.tasks || [];

  const nextStage = getNextStage(order.stage);
  const isFinalStage = order.stage === 'delivered';
  const remainingBalance = Math.max(0, order.totalAmount - order.depositPaid);

  // Cycle sub-task status
  const handleToggleTaskStatus = async (taskId: string, currentStatus: TaskStatus) => {
    const statusCycle: Record<TaskStatus, TaskStatus> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending',
      blocked: 'pending',
    };
    const nextStatus = statusCycle[currentStatus];

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
        .update(
          nextStatus === 'completed'
            ? { status: nextStatus, completed_at: new Date().toISOString() }
            : { status: nextStatus }
        )
        .eq('id', taskId);
      if (error) console.error('[DigitalJobCard] Task status update failed:', error);
    } catch (err) {
      console.error('[DigitalJobCard] Task status update threw:', err);
    }
  };

  // Add new sub-task
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

    // Sync to Supabase, attributed to the signed-in tailor/admin assigning the task
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

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'measurements', label: 'Measurements' },
    { id: 'tasks', label: `Tasks (${currentTasks.length})` },
    { id: 'fabric', label: 'Fabric & References' },
    { id: 'history', label: `History (${order.stageHistory.length})` },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={order.garmentTitle}
        subtitle={`Job card // #${order.id}`}
        icon={<Scissors size={17} />}
        maxWidth="max-w-5xl"
      >
        {/* Client, Financial, & Tailor Metadata Banner */}
        <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-500 block">Client</span>
              <span className="font-semibold text-gray-900">{order.clientName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Phone size={12} />
              <span>{order.clientPhone}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
            <div>
              <span className="text-gray-500 block">Financial Balance</span>
              <span className="font-semibold text-gray-900">
                Paid: GHS {order.depositPaid.toFixed(2)} / {order.totalAmount.toFixed(2)}
                {remainingBalance > 0 ? (
                  <span className="text-rose-600 font-semibold ml-1.5">(Due: GHS {remainingBalance.toFixed(2)})</span>
                ) : (
                  <span className="text-emerald-700 font-semibold ml-1.5">(Settled)</span>
                )}
              </span>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-3 py-1.5 bg-gray-900 text-white hover:bg-accent-600 rounded-md font-medium text-xs transition-colors flex items-center gap-1"
            >
              <Receipt size={12} />
              <span>Record Payment</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-500 block">Assigned Tailor</span>
              <span className="font-semibold text-gray-900">{order.assignedTailor}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar size={12} />
              <span>Due: {order.dueDate}</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Notification Prompt Toast */}
        {lastNotification && (
          <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 flex-1 min-w-[240px]">
              <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block">Stage advanced to {order.stage.toUpperCase()}</span>
                <p className="opacity-80">Ready to notify client with live garment tracking link.</p>
              </div>
            </div>

            <button
              onClick={() => {
                const waMsg = formatWhatsAppStageMessage(order, lastNotification.stage);
                openWhatsAppChat(order.clientPhone, waMsg);
              }}
              className="px-4 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <MessageCircle size={14} />
              <span>Send WhatsApp Update</span>
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-none">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
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

              <div className="p-4 bg-accent-50 border border-accent-100 rounded-xl text-sm">
                <div className="flex items-center gap-1.5 text-accent-700 font-semibold mb-1">
                  <ShieldCheck size={14} />
                  <span>Master Specification</span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Garment patterned with 1.5-inch side seam allowances for secondary client fitting adjustments.
                </p>
              </div>
            </div>
          )}

          {/* TAB: Tasks */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Workshop Task Checklist</h3>
                <span className="text-xs text-gray-500">
                  Granular tracking for pattern drafting, cutting, boning, and hand-finishing.
                </span>
              </div>

              <div className="space-y-2">
                {currentTasks.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-500">
                    No tasks defined for this order yet. Add sub-tasks below.
                  </div>
                ) : (
                  currentTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                        t.status === 'completed'
                          ? 'bg-emerald-50 border-emerald-200'
                          : t.status === 'in_progress'
                          ? 'bg-blue-50 border-blue-200'
                          : t.status === 'blocked'
                          ? 'bg-rose-50 border-rose-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <button onClick={() => handleToggleTaskStatus(t.id, t.status)} className="mt-0.5">
                          {t.status === 'completed' ? (
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                          ) : t.status === 'in_progress' ? (
                            <Clock size={18} className="text-blue-600 shrink-0" />
                          ) : t.status === 'blocked' ? (
                            <AlertOctagon size={18} className="text-rose-600 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded border-2 border-gray-300 hover:border-gray-500" />
                          )}
                        </button>
                        <div>
                          <span className={`text-sm font-medium text-gray-900 ${t.status === 'completed' ? 'line-through opacity-70' : ''}`}>
                            {t.title}
                          </span>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span>Artisan: {t.tailorName}</span>
                            {t.completedAt && (
                              <span className="text-emerald-600 font-medium">
                                Completed {new Date(t.completedAt).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleTaskStatus(t.id, t.status)}
                        className="px-2.5 py-1 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-600"
                      >
                        {t.status.replace('_', ' ')}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddNewTask} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <span className="text-xs font-semibold text-accent-600 block">Add Task</span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Cut interior silk lining & sew boning channels"
                    className="sm:col-span-7 bg-white rounded-lg p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 border border-gray-200"
                  />
                  <select
                    value={newTaskTailor}
                    onChange={(e) => setNewTaskTailor(e.target.value)}
                    className="sm:col-span-3 bg-white rounded-lg p-2.5 text-sm text-gray-900 focus:outline-none border border-gray-200"
                  >
                    <option value="Master Kwame Mensah">Master Kwame Mensah</option>
                    <option value="Artisan Kofi Badu">Artisan Kofi Badu</option>
                    <option value="Artisan Ama Frimpong">Artisan Ama Frimpong</option>
                  </select>
                  <button
                    type="submit"
                    className="sm:col-span-2 bg-gray-900 text-white rounded-lg p-2.5 font-medium text-sm hover:bg-accent-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: Fabric & References */}
          {activeTab === 'fabric' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {order.referenceImages.map((img, idx) => (
                  <div key={idx} className="h-64 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                    <img src={img} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-accent-600 font-semibold">
                  <Layers size={14} />
                  <span>Textile Specification</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-gray-500 block text-xs">Fabric Weave</span>
                    <span className="font-semibold text-gray-900">{order.fabricType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Color Palette</span>
                    <span className="font-semibold text-gray-900">{order.fabricColor}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500 block text-xs mb-1">Artisan Notes</span>
                  <p className="text-gray-700 leading-relaxed">{order.fabricNotes}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: History */}
          {activeTab === 'history' && (
            <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
              {order.stageHistory.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-gray-900 border-2 border-white" />
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-accent-600 text-sm capitalize">{item.stage}</span>
                      <span className="text-gray-400 text-xs">
                        {item.completedAt ? new Date(item.completedAt).toLocaleTimeString() : 'In Progress'}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{item.notes}</p>
                    {item.completedBy && <span className="text-xs text-gray-500 block">By {item.completedBy}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-xs text-gray-500 block">Current Production Status</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-lg font-semibold capitalize text-gray-900">{order.stage}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isFinalStage ? (
              <button
                disabled={isAdvancing}
                onClick={handleMarkStageComplete}
                className={`w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isAdvancing ? 'bg-gray-200 text-gray-400 cursor-wait' : 'bg-gray-900 text-white hover:bg-accent-600'
                }`}
              >
                {isAdvancing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating Stage...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Advance to {nextStage}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            ) : (
              <div className="px-5 py-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm font-semibold flex items-center gap-2">
                <Sparkles size={16} />
                <span>Garment Completed / Ready</span>
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
