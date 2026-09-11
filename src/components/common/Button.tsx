import React from 'react';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, variant = 'primary', disabled = false }) => {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      style={{
        padding: '12px 24px',
        borderRadius: '12px',
        border: 'none',
        fontWeight: 'bold',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {title}
    </button>
  );
};
