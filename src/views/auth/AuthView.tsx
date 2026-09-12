import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../services/supabaseClient';
import { Theme } from '../../styles/theme';

export function AuthView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha email e senha.');
      return;
    }
    try {
      setLoading(true);
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Sucesso!', 'Conta criada com sucesso. Verifique seu email se necessário.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conexa</Text>
      <Text style={styles.subtitle}>Conecte-se com sua comunidade</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Seu e-mail"
          placeholderTextColor={Theme.colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Sua senha"
          placeholderTextColor={Theme.colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Carregando...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchButton}>
          <Text style={styles.switchText}>
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, justifyContent: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: 'bold', color: Theme.colors.primary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: Theme.colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  form: { backgroundColor: Theme.colors.surface, padding: 20, borderRadius: Theme.radius.lg, borderWidth: 1, borderColor: Theme.colors.border },
  input: { backgroundColor: Theme.colors.background, color: Theme.colors.textPrimary, padding: 14, borderRadius: Theme.radius.sm, marginBottom: 14, borderWidth: 1, borderColor: Theme.colors.border, fontSize: 15 },
  button: { backgroundColor: Theme.colors.primary, padding: 14, borderRadius: Theme.radius.sm, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  switchButton: { marginTop: 16, alignItems: 'center' },
  switchText: { color: Theme.colors.accent, fontSize: 14, fontWeight: '600' }
});

export default AuthView;
