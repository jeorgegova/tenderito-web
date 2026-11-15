import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  IoArrowBack,
  IoTimeOutline,
  IoSearchOutline,
  IoCheckmarkCircle,
} from 'react-icons/io5';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { OverdueBadge } from '../components/ui/Badge';
import { DynamicBrandCurves } from '../components/ui/DynamicBrandCurves';
import { fetchOverdueCredits } from '../services/credits';
import { Colors, formatCOP } from '../theme';
import { formatDateDisplay } from '../utils/format';

export function ReportsScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['overdue'],
    queryFn: fetchOverdueCredits,
  });

  const total = (data ?? []).reduce((sum, credit) => sum + Number(credit.amount), 0);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data ?? []).filter(item => {
      const custName = item.customers?.name?.toLowerCase() || '';
      const alias = (item.customers as any)?.alias?.toLowerCase() || '';
      const concept = item.concept?.toLowerCase() || '';
      return !query || custName.includes(query) || alias.includes(query) || concept.includes(query);
    });
  }, [data, search]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: Colors.background,
        position: 'relative',
        paddingBottom: 40,
        overflowX: 'hidden',
      }}>
      <DynamicBrandCurves position="bottom-right" />

      {/* Header */}
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
          Fiados vencidos
        </span>
        <div style={{ width: 40 }} />
      </div>

      <div
        style={{
          padding: '20px',
          maxWidth: 480,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative',
          zIndex: 1,
        }}>
        {/* Resumen Total Vencido */}
        <Card
          style={{
            padding: 18,
            backgroundColor: '#FFF1F0',
            border: '1.5px solid #FCE0DE',
            borderRadius: 22,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                backgroundColor: '#FFE0DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: Colors.destructive,
              }}>
              <IoTimeOutline size={20} />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                color: Colors.destructive,
              }}>
              TOTAL VENCIDO
            </span>
          </div>

          <div style={{ fontSize: 32, fontWeight: 800, color: Colors.destructive }}>
            {formatCOP(total)}
          </div>
          <div style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>
            {data?.length ?? 0} fiados vencidos por cobrar
          </div>
        </Card>

        {/* Buscador */}
        <Input
          placeholder="Buscar cliente o fiado"
          value={search}
          onChange={e => setSearch(e.target.value)}
          leadingIcon="search"
          pill
        />

        <h3 style={{ fontSize: 16, fontWeight: 800, color: Colors.text, margin: '4px 0 0' }}>
          Pendientes de cobro
        </h3>

        {/* Lista de vencidos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && !isLoading ? (
            <Card style={{ textAlign: 'center', padding: 28 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: Colors.successAlt,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: Colors.success,
                  margin: '0 auto 10px',
                }}>
                <IoCheckmarkCircle size={26} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: Colors.text }}>
                {search ? 'Sin coincidencias' : '¡Todo al día!'}
              </div>
              <div style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>
                {search
                  ? 'Prueba con otro nombre o concepto.'
                  : 'No tienes fiados vencidos por cobrar.'}
              </div>
            </Card>
          ) : (
            filtered.map(item => (
              <Card
                key={item.id}
                onClick={() => navigate(`/customers/${item.customer_id}`)}
                style={{
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: Colors.destructiveAlt,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: Colors.destructive,
                    flexShrink: 0,
                  }}>
                  <IoTimeOutline size={20} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: Colors.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                    {item.customers?.alias || item.customers?.name || 'Cliente'}
                  </div>
                  <div style={{ fontSize: 13, color: Colors.textSecondary }}>
                    {item.concept}
                  </div>
                  <div style={{ fontSize: 11, color: Colors.destructive, fontWeight: 600 }}>
                    Venció el {formatDateDisplay(item.due_date)}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: Colors.destructive }}>
                    {formatCOP(Number(item.amount))}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <OverdueBadge text="Vencido" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
