import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  IoArrowBack,
  IoSwapHorizontal,
  IoPersonAdd,
  IoSearchOutline,
  IoChevronForward,
  IoLockClosed,
  IoReceiptOutline,
  IoAlertCircle,
  IoTrendingUp,
  IoCheckmark,
} from 'react-icons/io5';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DatePicker } from '../components/ui/DatePicker';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { Input } from '../components/ui/Input';
import { showAlert } from '../components/ui/AlertModal';
import { CreateCustomerModal } from '../components/CreateCustomerModal';
import { createCredit } from '../services/credits';
import { fetchCustomers } from '../services/customers';
import { canCreateCreditForCustomer } from '../services/portfolio';
import { useStore } from '../store/useStore';
import { Colors, Radius, formatCOP } from '../theme';
import { FormatMoney, parseMoney, getBogotaTodayYMD } from '../utils/format';
import { useMutationWithSync } from '../hooks/useMutationWithSync';
import type { CreditEligibility } from '../types';

const QUICK_CONCEPTS = [
  'Mercado semanal',
  'Abarrotes',
  'Lácteos y pan',
  'Bebidas y mecato',
  'Carnes y verduras',
  'Aseo para el hogar',
];

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];

export function NewCreditScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('customerId') || undefined;

  const [customer_id, setCustomerId] = useState(initialId ?? '');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [eligibility, setEligibility] = useState<CreditEligibility | null>(null);
  const profile = useStore(s => s.profile);

  const { data: customers } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => fetchCustomers(),
  });

  const selectedCustomer = customers?.find(c => c.id === customer_id);
  const numericAmount = parseMoney(amount);
  const currentBalance = Number(selectedCustomer?.current_balance ?? 0);
  const creditLimit = Number(selectedCustomer?.credit_limit ?? 0);
  const newBalance = currentBalance + numericAmount;
  const exceedsLimit =
    creditLimit > 0 && numericAmount > 0 && newBalance > creditLimit;
  const creditBlocked = Boolean(eligibility && !eligibility.allowed);

  useEffect(() => {
    let cancelled = false;

    if (!customer_id) {
      setEligibility(null);
      return;
    }

    canCreateCreditForCustomer(customer_id, profile).then(result => {
      if (!cancelled) {
        setEligibility(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [customer_id, profile, customers]);

  const matchingCustomers = (customers ?? []).filter(c =>
    `${c.alias ?? ''} ${c.name} ${c.document_number ?? ''}`
      .toLocaleLowerCase('es-CO')
      .includes(customerSearch.toLocaleLowerCase('es-CO')),
  );

  const mutation = useMutationWithSync(createCredit, {
    onSuccess: () => navigate(-1),
    onError: (error: any) =>
      showAlert({
        title: 'No se pudo registrar',
        message: error?.message ?? 'Intenta de nuevo',
        type: 'destructive',
      }),
  });

  const addAmount = (val: number) => {
    const current = parseMoney(amount);
    setAmount(FormatMoney(String(current + val)));
  };

  async function onSave() {
    if (!customer_id) {
      return showAlert({
        title: 'Faltan datos',
        message: 'Elige un cliente para el fiado',
        type: 'warning',
      });
    }
    if (!concept.trim() || !parseMoney(amount)) {
      return showAlert({
        title: 'Faltan datos',
        message: 'Ingresa un concepto y un monto válido',
        type: 'warning',
      });
    }

    const check = await canCreateCreditForCustomer(customer_id, profile);
    if (!check.allowed) {
      return showAlert({
        title: 'No puedes crear este fiado',
        message: check.message ?? 'Tu plan actual no lo permite.',
        type: 'warning',
      });
    }

    mutation.mutate({
      customer_id,
      concept: concept.trim(),
      amount: parseMoney(amount),
      due_date: dueDate.trim() || null,
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

      {/* Header fijo superior idéntico a la app */}
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
          Nuevo fiado
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
          gap: 14,
          position: 'relative',
          zIndex: 1,
        }}>
        {/* ── SELECCIÓN O BÚSQUEDA DEL CLIENTE ── */}
        {selectedCustomer ? (
          <Card
            style={{
              padding: 16,
              borderRadius: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
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
                    : selectedCustomer.phone
                    ? `📞 ${selectedCustomer.phone}`
                    : 'Cliente frecuente'}
                </div>
              </div>
              {!initialId ? (
                <button
                  type="button"
                  onClick={() => setCustomerId('')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    borderRadius: Radius.full,
                    backgroundColor: Colors.primaryLight,
                    border: `1px solid ${Colors.primaryMid}`,
                    cursor: 'pointer',
                  }}>
                  <IoSwapHorizontal size={14} color={Colors.primary} />
                  <span style={{ color: Colors.primaryDark, fontSize: 12, fontWeight: 800 }}>
                    Cambiar
                  </span>
                </button>
              ) : null}
            </div>

            <div style={{ height: 1, backgroundColor: '#F1F5F9' }} />

            {/* Fila de métricas financieras */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
                borderRadius: 14,
                padding: '10px 12px',
              }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: Colors.textMuted,
                    letterSpacing: '0.6px',
                  }}>
                  DEUDA ACTUAL
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: currentBalance > 0 ? Colors.destructive : Colors.text,
                    marginTop: 2,
                  }}>
                  {formatCOP(currentBalance)}
                </div>
              </div>
              <div style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: Colors.textMuted,
                    letterSpacing: '0.6px',
                  }}>
                  TOPE MÁXIMO
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: Colors.text, marginTop: 2 }}>
                  {creditLimit > 0 ? formatCOP(creditLimit) : 'Sin tope'}
                </div>
              </div>
              {creditLimit > 0 ? (
                <>
                  <div style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: Colors.textMuted,
                        letterSpacing: '0.6px',
                      }}>
                      CUPO LIBRE
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color:
                          creditLimit - currentBalance > 0
                            ? Colors.success
                            : Colors.destructive,
                        marginTop: 2,
                      }}>
                      {formatCOP(Math.max(0, creditLimit - currentBalance))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </Card>
        ) : (
          <Card
            style={{
              padding: 16,
              borderRadius: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
                  ¿A quién le vas a fiar?
                </div>
                <div style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}>
                  Busca el cliente o crea uno nuevo
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  backgroundColor: Colors.primaryLight,
                  borderRadius: Radius.full,
                  border: `1px solid ${Colors.primaryMid}`,
                  cursor: 'pointer',
                }}>
                <IoPersonAdd size={14} color={Colors.primary} />
                <span style={{ fontSize: 12, fontWeight: 800, color: Colors.primary }}>
                  Nuevo
                </span>
              </button>
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
                maxHeight: 220,
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
                      padding: '10px 0',
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
                    padding: '20px 0',
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
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 4,
                      padding: '6px 14px',
                      backgroundColor: Colors.primaryLight,
                      borderRadius: Radius.full,
                      border: `1px solid ${Colors.primaryMid}`,
                      cursor: 'pointer',
                    }}>
                    <IoPersonAdd size={14} color={Colors.primary} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: Colors.primaryDark,
                      }}>
                      Crear cliente ahora
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </Card>
        )}

        {/* ── ALERTA DE BLOQUEO POR PLAN ── */}
        {creditBlocked ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 14,
              padding: '10px 12px',
            }}>
            <IoLockClosed size={18} color={Colors.destructive} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: Colors.destructive,
                }}>
                Solo abonos para este cliente
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#991B1B',
                  marginTop: 2,
                  lineHeight: '16px',
                }}>
                {eligibility?.message}
              </div>
            </div>
          </div>
        ) : null}

        {/* ── DETALLE DEL FIADO (FORMULARIO PRINCIPAL) ── */}
        <Card
          style={{
            padding: 16,
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: -4 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                backgroundColor: Colors.primaryLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
              <IoReceiptOutline size={16} color={Colors.primary} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
              Detalles de la compra
            </span>
          </div>

          {/* Input Concepto con atajos rápidos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Input
              label="¿Qué se llevó? (Concepto)"
              leadingIcon="basket-outline"
              value={concept}
              onChange={e => setConcept(e.target.value)}
              placeholder="Ej. Mercado de la semana, gaseosas..."
              trailingIcon={concept ? 'close-circle' : undefined}
              onTrailingPress={() => setConcept('')}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                padding: '2px 0',
                scrollbarWidth: 'none',
              }}>
              {QUICK_CONCEPTS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setConcept(item)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    backgroundColor: concept === item ? Colors.primaryLight : '#F8FAFC',
                    border: `1px solid ${concept === item ? Colors.primaryMid : '#E2E8F0'}`,
                    color: concept === item ? Colors.primaryDark : Colors.textSecondary,
                    fontSize: 12,
                    fontWeight: concept === item ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Input Valor con atajos de suma rápida */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Input
              label="Valor del fiado"
              leadingIcon="cash-outline"
              value={amount ? FormatMoney(amount) : ''}
              onChange={e => setAmount(FormatMoney(e.target.value))}
              type="tel"
              placeholder="$ 0"
              trailingIcon={amount ? 'close-circle' : undefined}
              onTrailingPress={() => setAmount('')}
              error={
                exceedsLimit
                  ? `Supera el tope de crédito (${formatCOP(creditLimit)})`
                  : undefined
              }
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                padding: '2px 0',
                scrollbarWidth: 'none',
              }}>
              {QUICK_AMOUNTS.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => addAmount(val)}
                  style={{
                    padding: '6px 11px',
                    borderRadius: 999,
                    backgroundColor: '#FFF7ED',
                    border: '1px solid #FFEDD5',
                    color: Colors.primaryDark,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                  +{formatCOP(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Previsualización en tiempo real del saldo */}
          {numericAmount > 0 ? (
            exceedsLimit ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 14,
                  padding: '10px 12px',
                }}>
                <IoAlertCircle size={20} color={Colors.destructive} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: Colors.destructive,
                    }}>
                    Supera valor del tope
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#991B1B',
                      marginTop: 2,
                      lineHeight: '16px',
                    }}>
                    El tope asignado es {formatCOP(creditLimit)} y el nuevo saldo
                    quedaría en {formatCOP(newBalance)} (exceso de{' '}
                    {formatCOP(newBalance - creditLimit)}).
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 14,
                  padding: '10px 12px',
                }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 12,
                    backgroundColor: Colors.primaryLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  <IoTrendingUp size={18} color={Colors.primary} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: Colors.textMuted,
                      letterSpacing: '0.5px',
                    }}>
                    CÓMO QUEDARÁ SU CUENTA
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: Colors.textSecondary,
                      marginTop: 1,
                    }}>
                    Debe {formatCOP(currentBalance)} + Fiado {formatCOP(numericAmount)} ={' '}
                    <span
                      style={{
                        color: Colors.primaryDark,
                        fontWeight: 800,
                        fontSize: 14,
                      }}>
                      {formatCOP(newBalance)}
                    </span>
                  </div>
                </div>
              </div>
            )
          ) : null}

          {/* Fecha para pagar */}
          <DatePicker
            label="¿Cuándo acordaron pagar? (Opcional)"
            value={dueDate}
            onChange={date => setDueDate(date ?? '')}
            placeholder="Toca para elegir fecha límite"
            minDate={getBogotaTodayYMD()}
            helperText="Define el día en que acuerdas con el cliente que cancelará la cuenta."
          />
        </Card>
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
            title={mutation.isPending ? 'Guardando…' : 'Guardar fiado'}
            icon={<IoCheckmark size={20} />}
            onPress={onSave}
            disabled={mutation.isPending || creditBlocked || !numericAmount || !customer_id}
          />
          <Button
            title="Cancelar"
            variant="ghost"
            onPress={() => navigate(-1)}
          />
        </div>
      </div>

      <CreateCustomerModal
        visible={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        existingCustomers={customers}
        onCustomerCreated={newCust => {
          setCustomerId(newCust.id);
          setCustomerSearch('');
        }}
      />
    </div>
  );
}
