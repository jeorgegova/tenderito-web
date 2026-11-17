import { useState, useRef } from 'react';
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
import { MagnetRoleSwitch } from '../components/ui/MagnetRoleSwitch';
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
  const passwordInputRef = useRef<HTMLInputElement>(null);
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

        {/* Selector de Rol con efecto Magnet */}
        <MagnetRoleSwitch role={role} onChange={setRole} />

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
          <div style={{ textAlign: 'center', marginBottom: 2 }}>
            <h2
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: Colors.text,
                margin: 0,
                letterSpacing: '-0.3px',
              }}>
              {role === 'store' ? 'Acceso para tenderos' : 'Acceso para clientes'}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                margin: '5px 0 0',
                lineHeight: '18px',
                fontWeight: 500,
              }}>
              {role === 'store'
                ? 'Administra tu tienda, tus clientes y tus cuentas por cobrar.'
                : 'Consulta tus fiados y movimientos de tu cuenta en tu tienda.'}
            </p>
          </div>

          {role === 'store' ? (
            <Input
              label="Correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="tutienda@mail.com"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  passwordInputRef.current?.focus();
                }
              }}
            />
          ) : (
            <Input
              label="Número de identificación"
              value={document}
              onChange={e => setDocument(e.target.value)}
              placeholder="Tu cédula"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  passwordInputRef.current?.focus();
                }
              }}
            />
          )}

          <Input
            ref={passwordInputRef}
            label="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onLogin();
              }
            }}
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
