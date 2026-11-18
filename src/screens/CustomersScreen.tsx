import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  IoSearchOutline,
  IoPeopleOutline,
  IoCall,
  IoChevronForward,
  IoAddCircle,
} from 'react-icons/io5';
import { Card } from '../components/ui/Card';
import { Header } from '../components/ui/Header';
import { Input } from '../components/ui/Input';
import { SyncBadge } from '../components/ui/Badge';
import { MagnetFilterBar } from '../components/ui/MagnetFilterBar';
import { fetchCustomers } from '../services/customers';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { Colors, formatCOP } from '../theme';
import { CreateCustomerModal } from '../components/CreateCustomerModal';
import { MagnetTabBar } from '../components/ui/MagnetTabBar';

export function CustomersScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'owing' | 'clear'>('all');
  const [modal, setModal] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchCustomers(),
  });

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-CO');
    return (data ?? []).filter(customer => {
      const matchesSearch =
        !query ||
        customer.name.toLocaleLowerCase('es-CO').includes(query) ||
        (customer.alias ?? '').toLocaleLowerCase('es-CO').includes(query) ||
        (customer.document_number ?? '').includes(query) ||
        (customer.phone ?? '').includes(query);
      const hasBalance = Number(customer.current_balance) > 0;
      return (
        matchesSearch &&
        (balanceFilter === 'all' ||
          (balanceFilter === 'owing' ? hasBalance : !hasBalance))
      );
    });
  }, [data, search, balanceFilter]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))',
        overflowX: 'hidden',
      }}>
      <DynamicBrandCurves position="top-right" />

      <Header title="Clientes" subtitle="Busca y gestiona tus fiados" />

      {/* Buscador */}
      <div style={{ padding: '4px 20px 8px', position: 'relative', zIndex: 1 }}>
        <Input
          placeholder="Buscar nombre o teléfono"
          value={search}
          onChange={e => setSearch(e.target.value)}
          leadingIcon="search"
          pill
        />
      </div>

      {/* Barra de Filtros */}
      <div style={{ padding: '0 20px 14px', position: 'relative', zIndex: 1 }}>
        <MagnetFilterBar
          options={[
            { key: 'all', label: `Todos (${data?.length ?? 0})` },
            {
              key: 'owing',
              label: `Con deuda (${(data ?? []).filter(c => Number(c.current_balance) > 0).length})`,
            },
            {
              key: 'clear',
              label: `Al día (${(data ?? []).filter(c => Number(c.current_balance) === 0).length})`,
            },
          ]}
          selectedKey={balanceFilter}
          onSelect={key => setBalanceFilter(key as any)}
        />
      </div>

      {/* Listado de clientes */}
      <div
        style={{
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          position: 'relative',
          zIndex: 1,
        }}>
        {visibleCustomers.length === 0 && !isLoading ? (
          <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div style={{ color: Colors.textMuted, marginBottom: 12 }}>
              {search ? <IoSearchOutline size={38} /> : <IoPeopleOutline size={38} />}
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, marginBottom: 6 }}>
              {search ? 'Sin coincidencias' : 'Sin clientes registrados'}
            </h3>
            <p style={{ fontSize: 13, color: Colors.textSecondary, margin: 0, lineHeight: 1.4 }}>
              {search
                ? 'No encontramos clientes con esa búsqueda. Revisa el nombre o escribe la cédula.'
                : 'Toca el botón "+ Nuevo cliente" abajo para registrar tu primer cliente.'}
            </p>
          </Card>
        ) : (
          visibleCustomers.map(item => {
            const balance = Number(item.current_balance || 0);
            const isOwing = balance > 0;

            return (
              <Card
                key={item.id}
                onClick={() => navigate(`/customers/${item.id}`)}
                style={{
                  padding: 16,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: isOwing ? Colors.primaryLight : Colors.successAlt,
                      color: isOwing ? Colors.primary : Colors.success,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}>
                    {(item.alias || item.name).charAt(0).toUpperCase()}
                  </div>

                  {/* Info cliente */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: Colors.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                        {item.alias || item.name}
                      </span>
                      <SyncBadge estadoServidor={item.estadoServidor} />
                    </div>

                    {item.alias && (
                      <div style={{ fontSize: 12, color: Colors.textSecondary }}>
                        {item.name}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <IoCall size={12} color={Colors.textSecondary} />
                      <span style={{ fontSize: 12, color: Colors.textSecondary }}>
                        {item.phone || 'Sin teléfono'}
                      </span>
                    </div>
                  </div>

                  {/* Saldo / Estado */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 0.8,
                        color: isOwing ? Colors.destructive : Colors.success,
                      }}>
                      {isOwing ? 'TE DEBE' : 'AL DÍA'}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: isOwing ? Colors.text : Colors.success,
                      }}>
                      {formatCOP(balance)}
                    </div>
                  </div>
                </div>

                {/* Footer de la tarjeta */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTop: `1px solid ${Colors.border}`,
                  }}>
                  <span style={{ fontSize: 12, color: Colors.primary, fontWeight: 700 }}>
                    Ver libreta de cuentas
                  </span>
                  <IoChevronForward size={16} color={Colors.primary} />
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Botón flotante: + Nuevo cliente */}
      <button
        type="button"
        onClick={() => setModal(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(94px + env(safe-area-inset-bottom, 0px))',
          right: 20,
          backgroundColor: Colors.primary,
          color: '#FFFFFF',
          borderRadius: 28,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 8px 24px rgba(255, 107, 0, 0.4)',
          border: 'none',
          fontSize: 15,
          fontWeight: 800,
          cursor: 'pointer',
          zIndex: 999,
          transition: 'transform 0.15s',
        }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
        <IoAddCircle size={22} color="#FFFFFF" />
        <span>Nuevo cliente</span>
      </button>

      <CreateCustomerModal
        visible={modal}
        onClose={() => setModal(false)}
        existingCustomers={data}
        onCustomerCreated={() => {
          setModal(false);
          refetch();
        }}
      />
    </div>
  );
}
