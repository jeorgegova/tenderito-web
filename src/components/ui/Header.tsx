import React from 'react';
import { Colors } from '../../theme';

export function Header({
  title,
  subtitle,
  showCurve = false,
  rightElement,
}: {
  title: string;
  subtitle?: string;
  showCurve?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '16px 20px 12px',
        backgroundColor: 'transparent',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
      }}>
      {showCurve && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 220,
            height: 140,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
          }}>
          <div
            style={{
              position: 'absolute',
              top: -45,
              right: -25,
              width: 210,
              height: 155,
              borderBottomLeftRadius: 110,
              borderTopLeftRadius: 40,
              backgroundColor: '#FFE4D0',
              transform: 'rotate(-8deg)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: -55,
              right: -30,
              width: 175,
              height: 130,
              borderBottomLeftRadius: 95,
              borderTopLeftRadius: 30,
              backgroundColor: Colors.primary,
              transform: 'rotate(-6deg)',
            }}
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: Colors.primary,
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.8,
                color: Colors.primary,
              }}>
              TENDERITO
            </span>
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: Colors.text,
              letterSpacing: -0.8,
              lineHeight: 1.2,
              margin: 0,
            }}>
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: 14,
                color: Colors.textSecondary,
                marginTop: 4,
                fontWeight: 500,
                letterSpacing: -0.1,
                margin: '4px 0 0 0',
              }}>
              {subtitle}
            </p>
          )}
        </div>
        {rightElement && (
          <div style={{ marginLeft: 12, alignSelf: 'center', flexShrink: 0 }}>
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}
