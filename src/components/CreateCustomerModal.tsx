import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IoClose,
  IoSearch,
  IoCheckmarkCircle,
  IoPersonAdd,
  IoChevronForward,
  IoStorefrontOutline,
  IoArrowBack,
  IoWalletOutline,
  IoCallOutline,
  IoShieldCheckmark,
  IoThumbsUp,
  IoAlertCircle,
  IoWarning,
  IoHelpCircleOutline,
} from 'react-icons/io5';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { showAlert } from './ui/AlertModal';
import { StoreHistoryLockNotice } from './ui/StoreHistoryLockNotice';
import {
  canCreateCustomer,
  createCustomer,
  findCustomerByDocument,
  linkCustomerToStore,
  fetchGlobalCustomerHistory,
  getStoreBalance,
  getStoreLastMovement,
  evaluateCustomerPaymentHabit,
} from '../services/customers';
import { fetchProfile } from '../services/profile';
import { useStore } from '../store/useStore';
import { calculateSubscriptionStatus } from '../services/plans';
import { Colors, Radius, formatCOP } from '../theme';
import { FormatMoney, parseMoney } from '../utils/format';
import type { Customer } from '../types';

export const DOCUMENT_TYPES = [
  { value: 'CC', label: 'CC · Cédula de ciudadanía' },
  { value: 'CE', label: 'CE · Cédula de extranjería' },
  { value: 'NIT', label: 'NIT · Número tributario' },
  { value: 'PAS', label: 'PAS · Pasaporte' },
  { value: 'PEP', label: 'PEP · Permiso especial' },
  { value: 'PPT', label: 'PPT · Permiso protección temporal' },
];

interface CreateCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onCustomerCreated?: (customer: Customer) => void;
  existingCustomers?: Customer[];
}

export function CreateCustomerModal({
  visible,
  onClose,
  onCustomerCreated,
  existingCustomers = [],
}: CreateCustomerModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileFromStore = useStore(s => s.profile);
  const { data: profileQuery } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 60000,
  });
  const profile = profileQuery || profileFromStore;
  const subStatus = calculateSubscriptionStatus(profile);
  const hasProAccess =
    Boolean(profile?.subscription_plan && profile.subscription_plan.toLowerCase() !== 'free') &&
    (subStatus.effectivePlan !== 'free' ||
      subStatus.inGracePeriod ||
      !subStatus.isDowngradedToFree ||
      (profile?.subscription_status || '').toLowerCase() === 'active');

  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');
  const [alias, setAlias] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [verified, setVerified] = useState(false);
  const [checkingDocument, setCheckingDocument] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);

  function resetForm() {
    setName('');
    setDocumentType('CC');
    setDocumentNumber('');
    setPhone('');
    setEmail('');
    setCreditLimit('0');
    setAlias('');
    setFoundCustomer(null);
    setVerified(false);
    setViewingHistory(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleBackFromHistory() {
    if (window.history.state?.tenderitoModalSubView === 'customer-history') {
      window.history.back();
    } else {
      setViewingHistory(false);
    }
  }

  React.useEffect(() => {
    if (!viewingHistory) return;
    const handlePopState = () => {
      setViewingHistory(false);
    };
    try {
      window.history.pushState({ tenderitoModalSubView: 'customer-history' }, '');
    } catch (_e) {}
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [viewingHistory]);

  const matchedCustomer = React.useMemo(() => {
    const docClean = (documentNumber || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    if (!docClean && !foundCustomer) return null;
    return existingCustomers.find(c => {
      const cDocClean = (c.document_number || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
      const matchDoc = Boolean(docClean && cDocClean && docClean === cDocClean);
      const matchId = Boolean(
        foundCustomer && (
          (c.id && (c.id === foundCustomer.id || c.id === foundCustomer.server_id || c.id === foundCustomer.local_id)) ||
          (c.server_id && (c.server_id === foundCustomer.id || c.server_id === foundCustomer.server_id)) ||
          (c.local_id && (c.local_id === foundCustomer.id || c.local_id === foundCustomer.local_id))
        )
      );
      return matchDoc || matchId;
    });
  }, [foundCustomer, documentNumber, existingCustomers]);

  const isAlreadyLinked = Boolean(
    foundCustomer?.isLinkedToMyStore || matchedCustomer,
  );
  const targetCustomer = matchedCustomer || foundCustomer;

  const targetHistoryId =
    targetCustomer?.id ||
    targetCustomer?.server_id ||
    foundCustomer?.id ||
    foundCustomer?.server_id ||
    foundCustomer?.local_id;

  const historyQuery = useQuery({
    queryKey: ['customer-global-history', targetHistoryId],
    queryFn: () => fetchGlobalCustomerHistory(targetHistoryId!),
    enabled: Boolean(viewingHistory && targetHistoryId),
  });

  const historyStores = historyQuery.data?.stores ?? [];
  const historyCredits = historyQuery.data?.credits ?? [];
  const historyPayments = historyQuery.data?.payments ?? [];

  const totalHistoryBalance = historyStores.reduce(
    (sum: number, s: any) => sum + getStoreBalance(s, historyCredits, historyPayments),
    0,
  );
  const historyRating = evaluateCustomerPaymentHabit(
    historyStores,
    historyCredits,
    historyPayments,
  );

  async function onCheckDocument() {
    if (!documentNumber.trim()) {
      return showAlert('Faltan datos', 'Ingresa la identificación del cliente');
    }
    setCheckingDocument(true);
    try {
      const customer = await findCustomerByDocument(documentNumber.trim());
      setFoundCustomer(customer);
      setVerified(true);
      setViewingHistory(false);
      const docClean = documentNumber.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
      const localMatch = existingCustomers.find(c => {
        const cDocClean = (c.document_number || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
        return Boolean(docClean && cDocClean && docClean === cDocClean);
      });
      const target = localMatch || customer;
      if (target) {
        setName(target.name);
        setPhone(target.phone ?? '');
        setEmail(target.email ?? '');
        if (target.credit_limit) {
          setCreditLimit(FormatMoney(String(target.credit_limit)));
        }
        if (target.alias) {
          setAlias(target.alias);
        }
      } else {
        setName('');
      }
    } catch (error: any) {
      showAlert('No se pudo verificar', error?.message ?? 'Intenta de nuevo');
    } finally {
      setCheckingDocument(false);
    }
  }

  async function onCreate() {
    if (isAlreadyLinked) {
      return;
    }

    if (foundCustomer) {
      if (!documentNumber.trim()) {
        return showAlert('Faltan datos', 'Identificación es obligatoria');
      }
    } else if (!name.trim() || !documentNumber.trim() || !phone.trim()) {
      return showAlert(
        'Faltan datos',
        'Nombre, identificación y teléfono son obligatorios',
      );
    }

    setSaving(true);
    try {
      let createdResult: Customer;
      if (foundCustomer) {
        await linkCustomerToStore(
          foundCustomer,
          parseMoney(creditLimit),
          alias,
        );
        createdResult = {
          ...foundCustomer,
          alias: alias?.trim() || foundCustomer.alias || null,
          credit_limit: parseMoney(creditLimit),
        };
        showAlert(
          'Cliente vinculado',
          `"${alias?.trim() || foundCustomer.name}" ha sido vinculado a tu tienda exitosamente.`,
        );
      } else {
        createdResult = await createCustomer({
          name: name.trim(),
          document_type: documentType.trim().toUpperCase(),
          document_number: documentNumber.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          credit_limit: parseMoney(creditLimit),
          alias: alias.trim() || null,
        });
        showAlert(
          'Cliente creado',
          `"${alias?.trim() || name.trim()}" ha sido registrado exitosamente.`,
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['customers-all'] });

      onCustomerCreated?.(createdResult);
      handleClose();
    } catch (error: any) {
      showAlert('No se pudo guardar', error?.message ?? 'Intenta nuevamente');
    } finally {
      setSaving(false);
    }
  }

  if (!visible) return null;

  const modalContent = (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 12000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
        onClick={e => {
          if (e.target === e.currentTarget) handleClose();
        }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            width: '100%',
            maxWidth: 520,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: 'calc(100dvh - 24px)',
            height: 'auto',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
          }}>
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${Colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              backgroundColor: '#FFFFFF',
            }}>
            {viewingHistory ? (
              <>
                <button
                  type="button"
                  onClick={handleBackFromHistory}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: Colors.primary,
                    fontWeight: 700,
                    fontSize: 14,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 10px',
                    borderRadius: Radius.sm,
                    backgroundColor: '#FFF7ED',
                  }}>
                  <IoArrowBack size={18} />
                  <span>Volver</span>
                </button>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, margin: 0 }}>
                    Historial entre tiendas
                  </h2>
                  <span style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: 600 }}>
                    Red Tenderito
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: Colors.textSecondary,
                    cursor: 'pointer',
                    border: 'none',
                  }}>
                  <IoClose size={20} />
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: Colors.primaryLight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <IoPersonAdd size={18} color={Colors.primary} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: Colors.text, margin: 0 }}>
                      Nuevo cliente
                    </h2>
                    <span style={{ fontSize: 12, color: Colors.textSecondary }}>
                      Registra un cliente en tu libreta
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: Colors.textSecondary,
                    cursor: 'pointer',
                    border: 'none',
                  }}>
                  <IoClose size={20} />
                </button>
              </>
            )}
          </div>

          {/* Scrollable Form Body */}
          <div
            style={{
              padding: '20px 20px 16px',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
            {viewingHistory ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Cabecera del cliente con datos reales de la red */}
                <div
                  style={{
                    textAlign: 'center',
                    padding: '16px 14px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: Radius.lg,
                    border: `1px solid ${Colors.border}`,
                  }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: Colors.primaryLight,
                      color: Colors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      fontWeight: 800,
                      margin: '0 auto 10px',
                    }}>
                    {((targetCustomer?.alias || targetCustomer?.name || foundCustomer?.name || name || 'C') as string)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: Colors.text, margin: 0 }}>
                    {targetCustomer?.alias || targetCustomer?.name || foundCustomer?.name || name || 'Cliente'}
                  </h3>
                  {Boolean(
                    targetCustomer?.alias &&
                      (targetCustomer?.name || foundCustomer?.name || name),
                  ) && (
                    <div style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
                      {targetCustomer?.name || foundCustomer?.name || name}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: Colors.textMuted, marginTop: 4, fontWeight: 600 }}>
                    {(targetCustomer?.document_type || foundCustomer?.document_type || documentType || 'CC')}{' '}
                    {(targetCustomer?.document_number || foundCustomer?.document_number || documentNumber)} ·{' '}
                    {(targetCustomer?.phone || foundCustomer?.phone || phone || 'Sin teléfono')}
                  </div>
                </div>

                {/* Resumen total de deuda entre tiendas */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: Radius.lg,
                    backgroundColor: Colors.primaryLight,
                    border: `1.5px solid ${Colors.primaryMid}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: Colors.primary,
                      flexShrink: 0,
                    }}>
                    <IoWalletOutline size={22} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 0.8,
                        color: Colors.primaryDark,
                      }}>
                      DEUDA TOTAL EN TODAS LAS TIENDAS
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: Colors.primaryDark, marginTop: 2 }}>
                      {formatCOP(totalHistoryBalance)}
                    </div>
                  </div>
                </div>

                {/* Valoración de hábitos de pago */}
                {!historyQuery.isLoading && (
                  <div
                    style={{
                      padding: 14,
                      backgroundColor: '#FFFFFF',
                      borderRadius: Radius.md,
                      border: `1.5px solid ${historyRating.borderColor}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            backgroundColor: historyRating.bgColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                          {historyRating.tier === 'excellent' ? (
                            <IoShieldCheckmark size={18} color={historyRating.color} />
                          ) : historyRating.tier === 'good' ? (
                            <IoThumbsUp size={17} color={historyRating.color} />
                          ) : historyRating.tier === 'fair' ? (
                            <IoAlertCircle size={18} color={historyRating.color} />
                          ) : historyRating.tier === 'risk' ? (
                            <IoWarning size={18} color={historyRating.color} />
                          ) : (
                            <IoHelpCircleOutline size={18} color={historyRating.color} />
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: 0.7,
                              color: Colors.textSecondary,
                            }}>
                            VALORACIÓN DE PAGO
                          </div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 800,
                              color: historyRating.color,
                              marginTop: 1,
                            }}>
                            {historyRating.label}
                          </div>
                        </div>
                      </div>

                      {historyRating.score !== null && (
                        <div
                          style={{
                            padding: '5px 10px',
                            borderRadius: 999,
                            backgroundColor: historyRating.bgColor,
                            border: `1px solid ${historyRating.borderColor}`,
                            color: historyRating.color,
                            fontSize: 12,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}>
                          {historyRating.score} / 100
                        </div>
                      )}
                    </div>

                    {historyRating.score !== null && (
                      <div
                        style={{
                          width: '100%',
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: '#F1F5F9',
                          overflow: 'hidden',
                        }}>
                        <div
                          style={{
                            width: `${historyRating.score}%`,
                            height: '100%',
                            borderRadius: 999,
                            backgroundColor: historyRating.color,
                          }}
                        />
                      </div>
                    )}

                    <div style={{ fontSize: 12.5, color: Colors.textSecondary, lineHeight: 1.4 }}>
                      {historyRating.description}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 8,
                      }}>
                      <div
                        style={{
                          padding: '7px 9px',
                          borderRadius: 10,
                          backgroundColor: '#F8FAFC',
                          border: `1px solid ${Colors.border}`,
                        }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: Colors.textMuted }}>
                          ABONADO
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: Colors.text, marginTop: 2 }}>
                          {historyRating.paymentPercentage}%
                        </div>
                      </div>
                      <div
                        style={{
                          padding: '7px 9px',
                          borderRadius: 10,
                          backgroundColor: '#F8FAFC',
                          border: `1px solid ${Colors.border}`,
                        }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: Colors.textMuted }}>
                          ABONOS / FIADOS
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: Colors.text, marginTop: 2 }}>
                          {historyRating.paymentsCount} / {historyRating.creditsCount}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: '7px 9px',
                          borderRadius: 10,
                          backgroundColor: '#F8FAFC',
                          border: `1px solid ${Colors.border}`,
                        }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: Colors.textMuted }}>
                          ATRASOS
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 800,
                            color: historyRating.overdueCount > 0 ? Colors.destructive : Colors.success,
                            marginTop: 2,
                          }}>
                          {historyRating.overdueCount === 0
                            ? 'Sin atrasos'
                            : `${historyRating.overdueCount} vencido${historyRating.overdueCount === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <h4 style={{ fontSize: 15, fontWeight: 800, color: Colors.text, margin: '4px 0 0' }}>
                  Tiendas vinculadas
                </h4>

                {historyQuery.isLoading ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '24px 16px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: Radius.md,
                      border: `1px solid ${Colors.border}`,
                    }}>
                    <span style={{ fontSize: 13, color: Colors.textSecondary }}>Cargando historial…</span>
                  </div>
                ) : historyStores.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '24px 16px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: Radius.md,
                      border: `1px solid ${Colors.border}`,
                    }}>
                    <span style={{ fontSize: 13, color: Colors.textSecondary }}>
                      No hay otras tiendas registradas con este cliente.
                    </span>
                  </div>
                ) : (
                  historyStores.map((s: any) => {
                    const bal = getStoreBalance(s, historyCredits, historyPayments);
                    const isOwing = bal > 0;
                    const lastMov = getStoreLastMovement(s, historyCredits, historyPayments);
                    return (
                      <div
                        key={s.store_id}
                        style={{
                          padding: 14,
                          backgroundColor: '#FFFFFF',
                          borderRadius: Radius.md,
                          border: `1px solid ${Colors.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 19,
                              backgroundColor: '#F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: Colors.textSecondary,
                              flexShrink: 0,
                            }}>
                            <IoStorefrontOutline size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: Colors.text }}>
                              {s.store_name}
                            </div>
                            {s.phone && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: Colors.textSecondary,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  marginTop: 1,
                                }}>
                                <IoCallOutline size={12} color={Colors.primary} />
                                <a
                                  href={`tel:${s.phone}`}
                                  onClick={e => e.stopPropagation()}
                                  style={{
                                    color: Colors.primary,
                                    textDecoration: 'none',
                                    fontWeight: 600,
                                  }}>
                                  {s.phone}
                                </a>
                              </div>
                            )}
                            <div style={{ fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                              Último movimiento: {lastMov}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: isOwing ? Colors.destructive : Colors.success,
                            }}>
                            {isOwing ? 'DEBE' : 'AL DÍA'}
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: isOwing ? Colors.text : Colors.success,
                            }}>
                            {formatCOP(bal)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <>
          {/* Identificación y tipo con botón de buscar dentro del input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 105, flexShrink: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, display: 'block' }}>
                Tipo
              </label>
              <select
                value={documentType}
                onChange={e => {
                  setDocumentType(e.target.value);
                  setVerified(false);
                }}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: Radius.md,
                  border: `1.5px solid ${Colors.border}`,
                  padding: '0 8px',
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  color: Colors.text,
                  marginTop: 6,
                }}>
                {DOCUMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.value}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input
                label="Número de documento *"
                value={documentNumber}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setDocumentNumber(val);
                  setVerified(false);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!checkingDocument && documentNumber.trim()) {
                      onCheckDocument();
                    }
                  }
                }}
                placeholder="Ej. 10203040"
                trailingElement={
                  <button
                    type="button"
                    onClick={onCheckDocument}
                    disabled={checkingDocument || !documentNumber.trim()}
                    title="Buscar en Tenderito"
                    aria-label="Buscar en Tenderito"
                    style={{
                      height: 34,
                      padding: '0 12px',
                      borderRadius: Radius.sm,
                      backgroundColor:
                        !documentNumber.trim() || checkingDocument
                          ? '#FFF1E5'
                          : Colors.primary,
                      border: `1px solid ${
                        !documentNumber.trim() || checkingDocument
                          ? Colors.primaryMid
                          : Colors.primary
                      }`,
                      color:
                        !documentNumber.trim() || checkingDocument
                          ? Colors.primary
                          : '#FFFFFF',
                      fontSize: 12.5,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      cursor:
                        !documentNumber.trim() || checkingDocument
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: checkingDocument || !documentNumber.trim() ? 0.65 : 1,
                      transition: 'all 0.15s ease',
                      boxShadow:
                        !documentNumber.trim() || checkingDocument
                          ? 'none'
                          : '0 2px 4px rgba(255, 107, 0, 0.2)',
                      outline: 'none',
                      whiteSpace: 'nowrap',
                    }}>
                    <IoSearch size={15} className={checkingDocument ? 'spin' : ''} />
                    <span>Buscar</span>
                  </button>
                }
              />
            </div>
          </div>

          {verified && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                padding: '12px 0 0',
                borderTop: `1px dashed ${Colors.border}`,
              }}>
              {isAlreadyLinked && targetCustomer ? (
                <div
                  onClick={() => {
                    const custId = targetCustomer.id || targetCustomer.server_id || targetCustomer.local_id;
                    handleClose();
                    navigate(`/customers/${custId}`);
                  }}
                  role="button"
                  tabIndex={0}
                  title="Haz clic para ver la cartera y detalles del cliente"
                    style={{
                      backgroundColor: '#FFF7ED',
                      border: '1.5px solid #FDBA74',
                      borderRadius: Radius.lg,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(234, 88, 12, 0.08)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#EA580C';
                      e.currentTarget.style.backgroundColor = '#FFEDD5';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#FDBA74';
                      e.currentTarget.style.backgroundColor = '#FFF7ED';
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IoCheckmarkCircle size={26} color="#EA580C" />
                        <div>
                          <strong style={{ fontSize: 15, color: '#9A3412', display: 'block' }}>
                            Cliente ya vinculado a tu tienda
                          </strong>
                          <span style={{ fontSize: 13, color: '#C2410C' }}>
                            Este cliente ya forma parte de tu libreta de fiados.
                          </span>
                        </div>
                      </div>
                      <IoChevronForward size={18} color="#EA580C" style={{ flexShrink: 0 }} />
                    </div>

                    <div
                      style={{
                        height: 1,
                        backgroundColor: '#FED7AA',
                        width: '100%',
                      }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
                        {targetCustomer.alias || targetCustomer.name}
                      </div>
                      <div style={{ fontSize: 13, color: Colors.textSecondary }}>
                        {targetCustomer.document_type || 'CC'} {targetCustomer.document_number} · {targetCustomer.phone || 'Sin teléfono'}
                      </div>
                      {typeof targetCustomer.current_balance === 'number' && targetCustomer.current_balance > 0 && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: Colors.primary, marginTop: 4 }}>
                          Saldo actual: {formatCOP(targetCustomer.current_balance)}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: '#EA580C', fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>Ver cartera y detalles</span>
                        <IoChevronForward size={13} />
                      </div>
                    </div>
                  </div>
                ) : foundCustomer ? (
                  <>
                    <div
                      style={{
                        backgroundColor: Colors.successAlt,
                        border: `1px solid ${Colors.success}`,
                        borderRadius: Radius.md,
                        padding: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                      <IoCheckmarkCircle size={24} color={Colors.success} />
                      <div>
                        <strong style={{ fontSize: 14, color: Colors.success }}>
                          Cliente encontrado en la red
                        </strong>
                        <div style={{ fontSize: 13, color: Colors.text }}>
                          {foundCustomer.name}
                        </div>
                      </div>
                    </div>

                    {hasProAccess ? (
                      <button
                        type="button"
                        onClick={() => {
                          setViewingHistory(true);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          backgroundColor: '#FFF7ED',
                          border: `1.5px solid ${Colors.primaryMid}`,
                          padding: '10px 14px',
                          borderRadius: Radius.md,
                          cursor: 'pointer',
                          width: '100%',
                          boxSizing: 'border-box',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = '#FFEDD5';
                          e.currentTarget.style.borderColor = Colors.primary;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = '#FFF7ED';
                          e.currentTarget.style.borderColor = Colors.primaryMid;
                        }}>
                        <IoStorefrontOutline size={16} color={Colors.primary} />
                        <span
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontWeight: 700,
                            color: Colors.primary,
                            textAlign: 'left',
                          }}>
                          Ver historial entre tiendas
                        </span>
                        <IoChevronForward size={14} color={Colors.primary} />
                      </button>
                    ) : (
                      <StoreHistoryLockNotice
                        text="El historial crediticio entre tiendas está activo en planes pagos."
                      />
                    )}

                    <Input
                      label="Nombre completo *"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Nombre del cliente"
                      disabled={Boolean(foundCustomer)}
                    />

                    <Input
                      label="Apodo o alias en la tienda"
                      value={alias}
                      onChange={e => setAlias(e.target.value)}
                      placeholder="Ej. Doña Carmen, El Paisa..."
                    />

                    <Input
                      label="Celular *"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Ej. 300 123 4567"
                      type="tel"
                      disabled={Boolean(foundCustomer?.phone)}
                    />

                    <Input
                      label="Cupo máximo de fiado"
                      value={creditLimit}
                      onChange={e => setCreditLimit(FormatMoney(e.target.value))}
                      placeholder="$ 0"
                    />
                  </>
                ) : (
                  <>
                  {!hasProAccess && (
                    <StoreHistoryLockNotice
                      text="El historial crediticio entre tiendas está activo en planes pagos."
                    />
                  )}

                  <Input
                    label="Nombre completo *"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nombre del cliente"
                  />

                  <Input
                    label="Apodo o alias en la tienda"
                    value={alias}
                    onChange={e => setAlias(e.target.value)}
                    placeholder="Ej. Doña Carmen, El Paisa..."
                  />

                  <Input
                    label="Celular *"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Ej. 300 123 4567"
                    type="tel"
                  />

                  <Input
                    label="Cupo máximo de fiado"
                    value={creditLimit}
                    onChange={e => setCreditLimit(FormatMoney(e.target.value))}
                    placeholder="$ 0"
                  />
                </>
              )}
            </div>
          )}
          </>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '16px 20px calc(18px + env(safe-area-inset-bottom, 0px))',
            borderTop: `1px solid ${Colors.border}`,
            display: 'flex',
            gap: 10,
            flexShrink: 0,
            backgroundColor: '#FFFFFF',
            position: 'relative',
            zIndex: 10,
          }}>
          {viewingHistory ? (
            <div style={{ display: 'flex', width: '100%', gap: 10 }}>
              <Button
                title="Volver y usar este cliente"
                variant="primary"
                style={{ flex: 1 }}
                onPress={handleBackFromHistory}
              />
            </div>
          ) : verified && isAlreadyLinked && targetCustomer ? (
            <>
              <Button
                title="Cerrar"
                variant="ghost"
                style={{ flex: 1 }}
                onPress={handleClose}
              />
              <Button
                title="Ver detalle"
                variant="secondary"
                style={{ flex: 1.2 }}
                onPress={() => {
                  const custId = targetCustomer.id || targetCustomer.server_id || targetCustomer.local_id;
                  handleClose();
                  navigate(`/customers/${custId}`);
                }}
              />
              <Button
                title="Usar este cliente"
                variant="primary"
                style={{ flex: 1.8 }}
                onPress={() => {
                  const custId = targetCustomer.id || targetCustomer.server_id || targetCustomer.local_id || '';
                  handleClose();
                  if (onCustomerCreated) {
                    onCustomerCreated(targetCustomer);
                  }
                  if (
                    !window.location.pathname.includes('new-credit') &&
                    !window.location.pathname.includes('creditos/nuevo')
                  ) {
                    navigate(`/new-credit?customerId=${encodeURIComponent(custId)}`, {
                      state: { customer: targetCustomer },
                    });
                  }
                }}
              />
            </>
          ) : (
            <>
              <Button
                title="Cancelar"
                variant="ghost"
                style={{ flex: 1 }}
                onPress={handleClose}
              />
              <Button
                title={saving ? 'Guardando…' : foundCustomer ? 'Vincular a mi tienda' : 'Crear cliente'}
                variant="primary"
                disabled={saving || !verified}
                style={{ flex: 2 }}
                onPress={onCreate}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
