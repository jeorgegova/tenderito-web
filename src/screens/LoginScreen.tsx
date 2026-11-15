import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IoStorefrontOutline,
  IoPersonOutline,
  IoShieldCheckmarkOutline,
  IoCloudOfflineOutline,
} from 'react-icons/io5';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { showAlert } from '../components/ui/AlertModal';
import { supabase } from '../lib/supabase';
import { customerAuthEmail } from '../lib/customerAuth';
import { Colors, Radius } from '../theme';
import { getAppVersion } from '../services/deviceService';
import fondoLogin from '../assets/FondoLogin.png';
import nuevoLogo from '../assets/NuevoLogo.png';

export function LoginScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as 'store' | 'customer') || 'store';
  const initialDoc = searchParams.get('document') || '';

  const [role, setRole] = useState<'store' | 'customer'>(initialRole);
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState(initialDoc);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const appVersion = getAppVersion();

  async function onLogin() {
    if ((!email && role === 'store') || (!document && role === 'customer') || !password) {
      return showAlert({
        title: 'Faltan datos',
        message: 'Completa tus datos para ingresar',
        type: 'warning',
      });
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: role === 'store' ? email.trim() : customerAuthEmail(document),
      password,
    });
    setLoading(false);

    if (error) {
      return showAlert({
        title: 'No pudimos entrar',
        message: 'Verifica tu correo y contraseña.',
        type: 'destructive',
      });
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundImage: `url(${fondoLogin})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '32px 20px 24px',
        boxSizing: 'border-box',
      }}>
      {/* Contenido principal */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
        {/* Logo */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <img
            src={nuevoLogo}
            alt="Tenderito"
            style={{ width: 170, height: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Selector de Rol */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 4,
            width: '100%',
            marginBottom: 16,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            boxSizing: 'border-box',
          }}>
          {[
            { id: 'store', label: 'Soy tendero', icon: <IoStorefrontOutline size={18} /> },
            { id: 'customer', label: 'Soy cliente', icon: <IoPersonOutline size={18} /> },
          ].map(r => {
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id as any)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 20,
                  backgroundColor: active ? Colors.primaryLight : 'transparent',
                  color: active ? Colors.primary : Colors.textSecondary,
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                {r.icon}
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tarjeta de Formulario */}
        <Card
          style={{
            width: '100%',
            padding: '24px 20px',
            borderRadius: 24,
            boxShadow: '0 8px 30px rgba(20, 32, 51, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: Colors.text,
              margin: '0 0 4px',
              textAlign: 'center',
            }}>
            {role === 'store' ? 'Entra a tu tienda' : 'Entra a tu cuenta'}
          </h2>

          {role === 'store' ? (
            <Input
              label="Correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="tutienda@mail.com"
            />
          ) : (
            <Input
              label="Número de identificación"
              value={document}
              onChange={e => setDocument(e.target.value)}
              placeholder="Tu cédula"
            />
          )}

          <Input
            label="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}>
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/forgot-password?role=${role}${
                    role === 'customer' && document.trim()
                      ? `&document=${encodeURIComponent(document.trim())}`
                      : role === 'store' && email.trim()
                      ? `&email=${encodeURIComponent(email.trim())}`
                      : ''
                  }`,
                )
              }
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0',
                color: Colors.primary,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'right',
              }}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <Button
            title={
              loading
                ? 'Entrando…'
                : role === 'store'
                ? 'Entrar a mi tienda'
                : 'Ver mis fiados'
            }
            onPress={onLogin}
            disabled={loading}
          />

          {/* Divisor */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '8px 0',
            }}>
            <div style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
            <span style={{ fontSize: 12, color: Colors.textMuted, fontWeight: 600 }}>
              ¿Primera vez?
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
          </div>

          <Button
            title={
              role === 'store'
                ? 'Crear mi tienda gratis'
                : 'Activar mi cuenta de cliente'
            }
            variant="secondary"
            onPress={() =>
              navigate(role === 'store' ? '/register' : '/customer-register')
            }
          />
        </Card>
      </div>

      {/* Footer de confianza y versión */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          margin: '24px auto 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IoShieldCheckmarkOutline size={14} color={Colors.textMuted} />
            <span style={{ fontSize: 12, color: Colors.textMuted, fontWeight: 500 }}>
              Tus datos siempre seguros
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IoCloudOfflineOutline size={14} color={Colors.textMuted} />
            <span style={{ fontSize: 12, color: Colors.textMuted, fontWeight: 500 }}>
              Funciona sin internet
            </span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: Colors.textMuted, fontWeight: 600 }}>
          Versión {appVersion}
        </span>
      </div>
    </div>
  );
}
