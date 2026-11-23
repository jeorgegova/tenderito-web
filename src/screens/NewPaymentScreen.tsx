import React, { useState, useMemo, useLayoutEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { resetScroll } from '../components/ui/ScrollToTop';
import {
  IoArrowBack,
  IoCheckmarkCircle,
  IoEllipseOutline,
  IoCheckmarkDoneCircle,
  IoAlertCircleOutline,
  IoInformationCircleOutline,
  IoSearchOutline,
  IoChevronForward,
  IoCheckmark,
} from 'react-icons/io5';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { Input } from '../components/ui/Input';
import { showAlert } from '../components/ui/AlertModal';
import { fetchCustomerById, fetchCustomers } from '../services/customers';
import { createPayment } from '../services/payments';
import { Colors, formatCOP } from '../theme';
import { FormatMoney, parseMoney } from '../utils/format';
import { useMutationWithSync } from '../hooks/useMutationWithSync';

export function NewPaymentScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('customerId') || undefined;

  const [customer_id, setCustomerId] = useState(initialId ?? '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const { data: customers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => fetchCustomers(),
  });

  const customerQuery = useQuery({
    queryKey: ['customer', customer_id],
    queryFn: () => fetchCustomerById(customer_id),
    enabled: !!customer_id,
  });

  const selectedCustomer =
    customerQuery.data ??
    customers?.find(
      c =>
        c.id === customer_id ||
        c.local_id === customer_id ||
        c.server_id === customer_id,
    );
  const currentBalance = Number(selectedCustomer?.current_balance ?? 0);
  const numericAmount = parseMoney(amount);

  const isPaid = selectedCustomer != null && currentBalance <= 0;
  const exceedsBalance =
    numericAmount > 0 &&
    (currentBalance <= 0 || numericAmount > currentBalance);
  const remainingBalance = Math.max(0, currentBalance - numericAmount);
  const isTotalPayment = currentBalance > 0 && numericAmount === currentBalance;

  useLayoutEffect(() => {
    resetScroll();
  }, []);

  const matchingCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers ?? [];
    const query = customerSearch.toLocaleLowerCase('es-CO');
    return (customers ?? []).filter(c =>
      `${c.alias ?? ''} ${c.name} ${c.document_number ?? ''}`
        .toLocaleLowerCase('es-CO')
        .includes(query),
    );
  }, [customers, customerSearch]);

  const mutation = useMutationWithSync(createPayment, {
    customerId: customer_id,
    onSuccess: () => navigate(-1),
    onError: (error: any) =>
      showAlert({
        title: 'No se pudo guardar',
        message: error?.message ?? 'Intenta de nuevo',
        type: 'destructive',
      }),
  });

  const handlePayAll = () => {
    if (currentBalance <= 0) {
      return;
    }
    if (isTotalPayment) {
      setAmount('');
    } else {
      setAmount(FormatMoney(String(currentBalance)));
    }
  };

  async function onSave() {
    if (!customer_id) {
      return showAlert({
        title: 'Faltan datos',
        message: 'Selecciona un cliente para registrar el abono.',
        type: 'warning',
      });
    }
    if (isPaid || currentBalance <= 0) {
      return showAlert({
        title: 'Cliente al día',
        message: 'Este cliente no tiene saldo pendiente por pagar.',
        type: 'warning',
      });
    }
    if (!numericAmount || numericAmount <= 0) {
      return showAlert({
        title: 'Ingresa el valor',
        message: 'Escribe cuánto te entregó o abonó el cliente.',
        type: 'warning',
      });
    }
    if (numericAmount > currentBalance) {
      return showAlert({
        title: 'Supera lo que debe',
        message: `El cliente solo debe ${formatCOP(
          currentBalance,
        )}. No puedes registrar un abono mayor a la deuda pendiente.`,
        type: 'warning',
      });
    }
    mutation.mutate({
      customer_id,
      credit_id: null,
      amount: numericAmount,
      notes: notes.trim() || null,
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        boxSizing: 'border-box',
      }}>
      <DynamicBrandCurves position="top-right" />

      {/* Header fijo superior */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${Colors.border}`,
          backgroundColor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: Colors.primary,
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
          }}>
          <IoArrowBack size={20} />
          <span>Volver</span>
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: Colors.text }}>
          Registrar abono
        </span>
        <div style={{ width: 40 }} />
      </div>

      {/* Contenido scrolleable centrado */}
      <div
        style={{
          flex: 1,
          padding: '16px 20px 24px',
          maxWidth: 560,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
          zIndex: 1,
        }}>
        {selectedCustomer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tarjeta principal del cliente y su deuda */}
            <Card
              style={{
                padding: 18,
                borderRadius: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    backgroundColor: Colors.primaryLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${Colors.primaryMid}`,
                    flexShrink: 0,
                  }}>
                  <span style={{ color: Colors.primary, fontWeight: 800, fontSize: 17 }}>
                    {(selectedCustomer.alias || selectedCustomer.name)
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: Colors.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                    {selectedCustomer.alias && selectedCustomer.alias.trim()
                      ? selectedCustomer.alias
                      : selectedCustomer.name}
                  </div>
                  {selectedCustomer.alias && selectedCustomer.alias.trim() ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginTop: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                      {selectedCustomer.name}
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontSize: 12,
                      color: Colors.textMuted,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                    {selectedCustomer.document_number
                      ? `C.C. ${selectedCustomer.document_number}`
                      : 'Cliente'}
                  </div>
                </div>
                {!initialId ? (
                  <button
                    type="button"
                    onClick={() => setCustomerId('')}
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: Colors.primary,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                    }}>
                    Cambiar
                  </button>
                ) : null}
              </div>

              {/* Lo que debe en grande */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 16,
                  padding: '16px 20px',
                  textAlign: 'center',
                  border: '1px solid #E2E8F0',
                }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: Colors.textMuted,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                  }}>
                  Debe en total
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: currentBalance > 0 ? Colors.destructive : Colors.success,
                    marginTop: 4,
                    letterSpacing: '-0.5px',
                  }}>
                  {formatCOP(currentBalance)}
                </div>
              </div>

              {/* Botón rápido y grande para pagar todo */}
              {currentBalance > 0 ? (
                <button
                  type="button"
                  onClick={handlePayAll}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '14px 18px',
                    borderRadius: 16,
                    backgroundColor: isTotalPayment ? Colors.primary : '#FFF7ED',
                    border: `1.5px solid ${isTotalPayment ? Colors.primary : '#FFEDD5'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}>
                  {isTotalPayment ? (
                    <IoCheckmarkCircle size={22} color="#FFFFFF" />
                  ) : (
                    <IoEllipseOutline size={22} color={Colors.primary} />
                  )}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: isTotalPayment ? '#FFFFFF' : Colors.primaryDark,
                    }}>
                    Pagar toda la deuda ({formatCOP(currentBalance)})
                  </span>
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: 14,
                    padding: '12px 16px',
                  }}>
                  <IoCheckmarkCircle size={18} color="#15803D" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>
                    Este cliente está al día (debe $ 0)
                  </span>
                </div>
              )}
            </Card>

            {/* Entrada del abono o aviso de cliente al día */}
            {isPaid ? (
              <Card
                style={{
                  padding: 24,
                  borderRadius: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 10,
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                }}>
                <IoCheckmarkDoneCircle size={46} color="#15803D" />
                <div style={{ fontSize: 16, fontWeight: 800, color: '#15803D' }}>
                  ¡Cliente al día y a paz y salvo!
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#166534',
                    lineHeight: '19px',
                    maxWidth: 380,
                  }}>
                  Este cliente no tiene compras fiadas pendientes ni saldo adeudado ($ 0). No es posible ni necesario registrar abonos.
                </div>
              </Card>
            ) : (
              <Card
                style={{
                  padding: 18,
                  borderRadius: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}>
                <Input
                  label="¿Cuánto te entregó o abonó?"
                  leadingIcon="cash-outline"
                  value={amount ? FormatMoney(amount) : ''}
                  onChange={e => setAmount(FormatMoney(e.target.value))}
                  type="tel"
                  placeholder="$ 0"
                  error={
                    exceedsBalance
                      ? `Supera lo que debe. El cliente solo debe ${formatCOP(currentBalance)}`
                      : undefined
                  }
                />

                {/* Mensajes de resultado sencillos */}
                {exceedsBalance ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: 12,
                      padding: '10px 14px',
                    }}>
                    <IoAlertCircleOutline size={18} color={Colors.destructive} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: '#991B1B', lineHeight: '17px' }}>
                      Supera lo que debe. El cliente debe {formatCOP(currentBalance)}, no puedes registrar un abono de {formatCOP(numericAmount)}.
                    </span>
                  </div>
                ) : numericAmount > 0 ? (
                  isTotalPayment ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: 12,
                        padding: '10px 14px',
                      }}>
                      <IoCheckmarkCircle size={18} color="#15803D" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>
                        ¡Queda a paz y salvo! La deuda quedará en $ 0.
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: '10px 14px',
                      }}>
                      <IoInformationCircleOutline size={18} color={Colors.textSecondary} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: Colors.textSecondary }}>
                        Ahora quedará debiendo:{' '}
                        <strong style={{ color: Colors.destructive, fontWeight: 800 }}>
                          {formatCOP(remainingBalance)}
                        </strong>
                      </span>
                    </div>
                  )
                ) : null}

                <Input
                  label="Nota (opcional)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej. En efectivo, Nequi..."
                />
              </Card>
            )}
          </div>
        ) : (
          /* Buscador de clientes si entra sin cliente seleccionado */
          <Card
            style={{
              padding: 18,
              borderRadius: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
                ¿Quién te va a pagar?
              </div>
              <div style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}>
                Busca el cliente que tiene cuenta pendiente
              </div>
            </div>

            <Input
              leadingIcon="search-outline"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Escribe nombre, alias o cédula..."
              trailingIcon={customerSearch ? 'close-circle' : undefined}
              onTrailingPress={() => setCustomerSearch('')}
            />

            <div
              style={{
                maxHeight: 260,
                overflowY: 'auto',
                backgroundColor: '#F8FAFC',
                borderRadius: 14,
                padding: '0 10px',
                border: '1px solid #F1F5F9',
                display: 'flex',
                flexDirection: 'column',
              }}>
              {matchingCustomers.map(customer => {
                const hasAlias = Boolean(customer.alias && customer.alias.trim());
                const custBal = Number(customer.current_balance || 0);
                return (
                  <div
                    key={customer.id}
                    onClick={() => {
                      setCustomerId(customer.id);
                      setCustomerSearch('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 0',
                      borderBottom: '1px solid #E2E8F0',
                      cursor: 'pointer',
                    }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 13,
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #E2E8F0',
                        flexShrink: 0,
                      }}>
                      <span style={{ color: Colors.primary, fontWeight: 800, fontSize: 15 }}>
                        {(customer.alias || customer.name).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: Colors.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                        {hasAlias ? customer.alias : customer.name}
                      </div>
                      {hasAlias ? (
                        <div
                          style={{
                            fontSize: 11.5,
                            color: Colors.textSecondary,
                            marginTop: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                          {customer.name}
                        </div>
                      ) : null}
                      <div
                        style={{
                          fontSize: 11,
                          color: Colors.textMuted,
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                        {customer.document_number
                          ? `C.C. ${customer.document_number} · `
                          : ''}
                        {customer.phone ? `📞 ${customer.phone}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: custBal > 0 ? Colors.destructive : Colors.textSecondary,
                        }}>
                        {custBal > 0 ? `Debe ${formatCOP(custBal)}` : 'Al día'}
                      </span>
                      <IoChevronForward size={15} color={Colors.textMuted} />
                    </div>
                  </div>
                );
              })}
              {matchingCustomers.length === 0 ? (
                <div
                  style={{
                    padding: '24px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                  <IoSearchOutline size={26} color={Colors.textMuted} />
                  <span
                    style={{
                      fontSize: 13,
                      color: Colors.textSecondary,
                      textAlign: 'center',
                    }}>
                    No encontramos clientes con "{customerSearch}".
                  </span>
                </div>
              ) : null}
            </div>
          </Card>
        )}
      </div>

      {/* ── BOTONES INFERIORES FIJOS (FOOTER IDÉNTICO) ── */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: Colors.card,
          borderTop: `1px solid ${Colors.border}`,
          padding: '16px 20px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: '0 -3px 8px rgba(20, 32, 51, 0.04)',
          zIndex: 100,
        }}>
        <div style={{ maxWidth: 560, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            title={mutation.isPending ? 'Guardando…' : 'Guardar abono'}
            icon={<IoCheckmark size={20} />}
            onPress={onSave}
            disabled={mutation.isPending || !customer_id || !numericAmount || exceedsBalance || isPaid}
          />
          <Button
            title="Cancelar"
            variant="ghost"
            onPress={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  );
}
