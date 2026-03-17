import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, Calendar, Clock, LogOut, Settings, User } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import {
  Appointment,
  Notification,
  acceptAppointment,
  cancelAppointment,
  listAppointments,
  listNotifications,
  markAllNotificationsAsRead,
  updateProfile,
} from '@/lib/api';

type AuthMode = 'login' | 'register';
type ActivePanel = 'overview' | 'notifications' | 'account';

function formatAppointmentStatus(status: Appointment['status']) {
  if (status === 'PENDING') return 'Pendente';
  if (status === 'CONFIRMED') return 'Confirmado';
  if (status === 'CANCELLED') return 'Cancelado';
  if (status === 'COMPLETED') return 'Concluido';
  if (status === 'NO_SHOW') return 'Nao compareceu';
  return status;
}

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ panel?: string }>();
  const isFocused = useIsFocused();
  const { user, accessToken, isAuthenticated, isLoading, login, logout, refreshProfile, register } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [activePanel, setActivePanel] = useState<ActivePanel>('overview');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPhone, setAccountPhone] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);

  useEffect(() => {
    if (params.panel === 'notifications' || params.panel === 'account') {
      setActivePanel(params.panel);
    }
  }, [params.panel]);

  useEffect(() => {
    if (!user) return;

    setAccountName(user.name ?? '');
    setAccountEmail(user.email ?? '');
    setAccountPhone(user.phone ?? '');
  }, [user]);

  useEffect(() => {
    if (!isFocused || !isAuthenticated || !accessToken) {
      if (!isAuthenticated) {
        setAppointments([]);
        setNotifications([]);
      }
      return;
    }

    const token = accessToken;

    async function loadDashboardData() {
      setAppointmentsLoading(true);
      setNotificationsLoading(true);
      setAppointmentsError(null);
      setNotificationsError(null);

      try {
        const [appointmentsResponse, notificationsResponse] = await Promise.all([
          listAppointments(token),
          listNotifications(token),
        ]);
        setAppointments(appointmentsResponse.appointments);
        setNotifications(notificationsResponse);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar seus dados';
        setAppointmentsError(message);
        setNotificationsError(message);
      } finally {
        setAppointmentsLoading(false);
        setNotificationsLoading(false);
      }
    }

    loadDashboardData();
  }, [accessToken, isAuthenticated, isFocused]);

  const upcomingAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          new Date(appointment.scheduledAt).getTime() >= Date.now() && appointment.status !== 'CANCELLED'
      ),
    [appointments]
  );

  const pastAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          new Date(appointment.scheduledAt).getTime() < Date.now() || appointment.status === 'CANCELLED'
      ),
    [appointments]
  );

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !dismissedNotificationIds.includes(notification.id)),
    [dismissedNotificationIds, notifications]
  );

  const unreadNotifications = useMemo(
    () => visibleNotifications.filter((notification) => !notification.isRead),
    [visibleNotifications]
  );

  const togglePanel = (panel: Exclude<ActivePanel, 'overview'>) => {
    setActivePanel((currentPanel) => (currentPanel === panel ? 'overview' : panel));
  };

  const clearAuthForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setAuthError(null);
  };

  const validateAuthForm = () => {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (authMode === 'register' && !trimmedName) return 'Informe seu nome para criar a conta.';
    if (!trimmedEmail) return 'Informe seu e-mail.';
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) return 'Digite um e-mail valido.';
    if (authMode === 'register' && trimmedPhone && trimmedPhone.replace(/\D/g, '').length < 10) {
      return 'Digite um telefone valido com DDD.';
    }
    if (!password) return 'Informe sua senha.';

    if (authMode === 'register') {
      if (password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
      if (!/[A-Z]/.test(password)) return 'A senha precisa ter ao menos uma letra maiuscula.';
      if (!/\d/.test(password)) return 'A senha precisa ter ao menos um numero.';
    }

    return null;
  };

  const handleAuthenticate = async () => {
    const validationError = validateAuthForm();
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    setAuthError(null);

    try {
      if (authMode === 'login') {
        await login({ email: email.trim(), password });
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
        });
      }
      clearAuthForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tente novamente.';
      setAuthError(message);
      Alert.alert('Nao foi possivel entrar', message);
    }
  };

  const reloadAppointments = async () => {
    if (!accessToken) return;
    const response = await listAppointments(accessToken);
    setAppointments(response.appointments);
  };

  const reloadNotifications = async () => {
    if (!accessToken) return;
    const response = await listNotifications(accessToken);
    setNotifications(response);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!accessToken) return;

    try {
      await cancelAppointment(accessToken, appointmentId, 'Cancelado pelo cliente no app');
      await reloadAppointments();
      await reloadNotifications();
      Alert.alert('Agendamento cancelado', 'Seu agendamento foi cancelado com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao cancelar', error instanceof Error ? error.message : 'Tente novamente em instantes.');
    }
  };

  const handleAcceptAppointment = async (appointmentId: string) => {
    if (!accessToken) return;

    try {
      await acceptAppointment(accessToken, appointmentId);
      await reloadAppointments();
      await reloadNotifications();
      Alert.alert('Agendamento aceito', 'O cliente foi avisado da confirmacao.');
    } catch (error) {
      Alert.alert('Erro ao aceitar', error instanceof Error ? error.message : 'Tente novamente em instantes.');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!accessToken) return;

    try {
      await markAllNotificationsAsRead(accessToken);
      await reloadNotifications();
    } catch (error) {
      Alert.alert('Erro ao marcar avisos', error instanceof Error ? error.message : 'Tente novamente em instantes.');
    }
  };

  const handleClearNotifications = () => {
    setDismissedNotificationIds((currentIds) => [
      ...currentIds,
      ...visibleNotifications.map((notification) => notification.id).filter((id) => !currentIds.includes(id)),
    ]);
    setNotificationsError(null);
  };

  const handleSaveAccount = async () => {
    if (!accessToken || user?.role !== 'CLIENT') return;

    const trimmedName = accountName.trim();
    const trimmedEmail = accountEmail.trim();
    const trimmedPhone = accountPhone.trim();

    if (!trimmedName) {
      setAccountError('Informe seu nome.');
      return;
    }

    if (!trimmedEmail) {
      setAccountError('Informe seu e-mail.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setAccountError('Digite um e-mail valido.');
      return;
    }

    if (trimmedPhone && trimmedPhone.replace(/\D/g, '').length < 10) {
      setAccountError('Digite um telefone valido com DDD.');
      return;
    }

    if (accountPassword) {
      if (accountPassword.length < 8) {
        setAccountError('A nova senha precisa ter pelo menos 8 caracteres.');
        return;
      }

      if (!/[A-Z]/.test(accountPassword)) {
        setAccountError('A nova senha precisa ter ao menos uma letra maiuscula.');
        return;
      }

      if (!/\d/.test(accountPassword)) {
        setAccountError('A nova senha precisa ter ao menos um numero.');
        return;
      }

      if (accountPassword !== accountConfirmPassword) {
        setAccountError('A confirmacao da senha nao confere.');
        return;
      }
    }

    setAccountSaving(true);
    setAccountError(null);
    setAccountSuccess(null);

    try {
      await updateProfile(accessToken, {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        password: accountPassword || undefined,
      });
      await refreshProfile();
      setAccountPassword('');
      setAccountConfirmPassword('');
      setAccountSuccess('Seus dados foram atualizados com sucesso.');
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Nao foi possivel atualizar seus dados.');
    } finally {
      setAccountSaving(false);
    }
  };

  if (isLoading && !isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator color={Colors.primary[500]} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginHeader}>
          <Image
            source={{
              uri: 'https://images.pexels.com/photos/3997391/pexels-photo-3997391.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
            }}
            style={styles.loginImage}
          />
          <View style={styles.loginTitleContainer}>
            <Text variant="h2" color="white" weight="semibold">
              Karoll Novo Estilo
            </Text>
            <Text variant="body" color="white">
              Faca login para gerenciar seus agendamentos
            </Text>
          </View>
        </View>

        <View style={styles.loginForm}>
          <Card style={styles.loginCard}>
            <View style={styles.authTabs}>
              <TouchableOpacity
                style={[styles.authTab, authMode === 'login' && styles.authTabActive]}
                onPress={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
              >
                <Text color={authMode === 'login' ? 'white' : 'secondary'} weight="medium">
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTab, authMode === 'register' && styles.authTabActive]}
                onPress={() => {
                  setAuthMode('register');
                  setAuthError(null);
                }}
              >
                <Text color={authMode === 'register' ? 'white' : 'secondary'} weight="medium">
                  Cadastro
                </Text>
              </TouchableOpacity>
            </View>

            {authError ? (
              <Card style={styles.authErrorCard}>
                <Text variant="bodySmall" color="error">
                  {authError}
                </Text>
              </Card>
            ) : null}

            {authMode === 'register' ? (
              <TextInput
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  if (authError) setAuthError(null);
                }}
                placeholder="Seu nome"
                style={styles.input}
                placeholderTextColor={Colors.neutral[400]}
              />
            ) : null}

            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (authError) setAuthError(null);
              }}
              placeholder="Seu e-mail"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor={Colors.neutral[400]}
            />

            {authMode === 'register' ? (
              <TextInput
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  if (authError) setAuthError(null);
                }}
                placeholder="Telefone"
                keyboardType="phone-pad"
                style={styles.input}
                placeholderTextColor={Colors.neutral[400]}
              />
            ) : null}

            <TextInput
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (authError) setAuthError(null);
              }}
              placeholder={authMode === 'login' ? 'Senha' : 'Senha com maiuscula e numero'}
              secureTextEntry
              style={styles.input}
              placeholderTextColor={Colors.neutral[400]}
            />

            <Button
              title={authMode === 'login' ? 'Fazer Login' : 'Criar Conta'}
              onPress={handleAuthenticate}
              style={styles.loginButton}
              size="lg"
              isLoading={isLoading}
              disabled={!email || !password || (authMode === 'register' && !name)}
            />
          </Card>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <Image
            source={{
              uri:
                user?.avatarUrl ??
                'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=600',
            }}
            style={styles.profileImage}
          />
          <View style={styles.profileDetails}>
            <Text variant="h3" weight="semibold" color="white">
              {user?.name}
            </Text>
            <Text variant="body" color="white">
              {user?.email}
            </Text>
            <Text variant="bodySmall" color="white">
              {user?.phone || 'Telefone nao informado'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/appointments')}>
          <View style={styles.actionIcon}>
            <Calendar size={20} color={Colors.primary[500]} />
          </View>
          <Text variant="bodySmall" style={styles.actionText}>
            Agendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => togglePanel('notifications')}>
          <View style={styles.actionIcon}>
            <Bell size={20} color={Colors.primary[500]} />
          </View>
          <Text variant="bodySmall" style={styles.actionText}>
            Avisos
          </Text>
          {unreadNotifications.length > 0 ? <View style={styles.badge} /> : null}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => togglePanel('account')}>
          <View style={styles.actionIcon}>
            <Settings size={20} color={Colors.primary[500]} />
          </View>
          <Text variant="bodySmall" style={styles.actionText}>
            Conta
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={logout}>
          <View style={[styles.actionIcon, styles.logoutIcon]}>
            <LogOut size={20} color={Colors.error[500]} />
          </View>
          <Text variant="bodySmall" color="error" style={styles.actionText}>
            Sair
          </Text>
        </TouchableOpacity>
      </View>

      {activePanel === 'notifications' ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h4" weight="semibold">
              Notificacoes
            </Text>
            <View style={styles.sectionActions}>
              {visibleNotifications.length > 0 ? (
                <TouchableOpacity onPress={handleClearNotifications}>
                  <Text variant="bodySmall" color="accent">
                    Limpar
                  </Text>
                </TouchableOpacity>
              ) : null}
              {unreadNotifications.length > 0 ? (
                <TouchableOpacity onPress={handleMarkAllAsRead}>
                  <Text variant="bodySmall" color="accent">
                    Marcar lidas
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {notificationsLoading ? <ActivityIndicator color={Colors.primary[500]} /> : null}
          {notificationsError ? (
            <Card>
              <Text variant="body" color="error">
                {notificationsError}
              </Text>
            </Card>
          ) : null}

          {!notificationsLoading && visibleNotifications.length === 0 ? (
            <Card>
              <Text variant="body" color="secondary">
                Voce ainda nao possui notificacoes.
              </Text>
            </Card>
          ) : null}

          {visibleNotifications.map((notification) => (
            <Card key={notification.id} style={styles.listCard}>
              <View style={styles.notificationHeader}>
                <Text variant="body" weight="semibold">
                  {notification.title}
                </Text>
                <Text variant="bodySmall" color={notification.isRead ? 'secondary' : 'accent'}>
                  {notification.isRead ? 'Lida' : 'Nova'}
                </Text>
              </View>
              <Text variant="bodySmall" color="secondary">
                {notification.message}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      {activePanel === 'account' ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h4" weight="semibold">
              Conta
            </Text>
          </View>

          {user?.role === 'CLIENT' ? (
            <Card style={styles.listCard}>
              {accountError ? (
                <Card style={styles.inlineFeedbackError}>
                  <Text variant="bodySmall" color="error">
                    {accountError}
                  </Text>
                </Card>
              ) : null}

              {accountSuccess ? (
                <Card style={styles.inlineFeedbackSuccess}>
                  <Text variant="bodySmall" color="primary">
                    {accountSuccess}
                  </Text>
                </Card>
              ) : null}

              <Text variant="bodySmall" color="secondary">
                Nome
              </Text>
              <TextInput
                value={accountName}
                onChangeText={(value) => {
                  setAccountName(value);
                  if (accountError) setAccountError(null);
                  if (accountSuccess) setAccountSuccess(null);
                }}
                placeholder="Seu nome"
                style={styles.input}
                placeholderTextColor={Colors.neutral[400]}
              />

              <Text variant="bodySmall" color="secondary">
                E-mail
              </Text>
              <TextInput
                value={accountEmail}
                onChangeText={(value) => {
                  setAccountEmail(value);
                  if (accountError) setAccountError(null);
                  if (accountSuccess) setAccountSuccess(null);
                }}
                placeholder="Seu e-mail"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholderTextColor={Colors.neutral[400]}
              />

              <Text variant="bodySmall" color="secondary">
                Telefone
              </Text>
              <TextInput
                value={accountPhone}
                onChangeText={(value) => {
                  setAccountPhone(value);
                  if (accountError) setAccountError(null);
                  if (accountSuccess) setAccountSuccess(null);
                }}
                placeholder="Telefone"
                keyboardType="phone-pad"
                style={styles.input}
                placeholderTextColor={Colors.neutral[400]}
              />

              <Text variant="bodySmall" color="secondary">
                Nova senha
              </Text>
              <TextInput
                value={accountPassword}
                onChangeText={(value) => {
                  setAccountPassword(value);
                  if (accountError) setAccountError(null);
                  if (accountSuccess) setAccountSuccess(null);
                }}
                placeholder="Deixe em branco para manter"
                secureTextEntry
                style={styles.input}
                placeholderTextColor={Colors.neutral[400]}
              />

              <Text variant="bodySmall" color="secondary">
                Confirmar nova senha
              </Text>
              <TextInput
                value={accountConfirmPassword}
                onChangeText={(value) => {
                  setAccountConfirmPassword(value);
                  if (accountError) setAccountError(null);
                  if (accountSuccess) setAccountSuccess(null);
                }}
                placeholder="Repita a nova senha"
                secureTextEntry
                style={styles.input}
                placeholderTextColor={Colors.neutral[400]}
              />

              <Button
                title="Salvar alteracoes"
                onPress={handleSaveAccount}
                style={styles.refreshButton}
                isLoading={accountSaving}
                disabled={accountSaving}
              />
            </Card>
          ) : (
            <Card style={styles.listCard}>
              <Text variant="bodySmall" color="secondary">
                Nome
              </Text>
              <Text variant="body" weight="medium">
                {user?.name}
              </Text>

              <View style={styles.accountSpacing} />
              <Text variant="bodySmall" color="secondary">
                E-mail
              </Text>
              <Text variant="body" weight="medium">
                {user?.email}
              </Text>

              <View style={styles.accountSpacing} />
              <Text variant="bodySmall" color="secondary">
                Telefone
              </Text>
              <Text variant="body" weight="medium">
                {user?.phone || 'Nao informado'}
              </Text>

              <View style={styles.accountSpacing} />
              <Text variant="bodySmall" color="secondary">
                Perfil
              </Text>
              <Text variant="body" weight="medium">
                {user?.role}
              </Text>

              <Button title="Atualizar dados" onPress={refreshProfile} style={styles.refreshButton} />
            </Card>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="h4" weight="semibold">
            Proximos Agendamentos
          </Text>
          {activePanel !== 'overview' ? (
            <TouchableOpacity onPress={() => setActivePanel('overview')}>
              <Text variant="bodySmall" color="accent">
                Voltar ao painel
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {appointmentsLoading ? <ActivityIndicator color={Colors.primary[500]} /> : null}
        {appointmentsError ? (
          <Card>
            <Text variant="body" color="error">
              {appointmentsError}
            </Text>
          </Card>
        ) : null}

        {!appointmentsLoading && upcomingAppointments.length === 0 && !appointmentsError ? (
          <Card>
            <Text variant="body" color="secondary">
              Voce ainda nao tem proximos agendamentos.
            </Text>
          </Card>
        ) : null}

        {upcomingAppointments.map((appointment) => (
          <Card key={appointment.id} style={styles.listCard}>
            <View style={styles.notificationHeader}>
              <Text variant="body" weight="semibold" color="accent">
                {appointment.service?.title ?? 'Servico'}
              </Text>
              <Text variant="bodySmall" color="secondary">
                {formatAppointmentStatus(appointment.status)}
              </Text>
            </View>

            <Text variant="bodySmall" color="secondary">
              {appointment.professional?.user.name ?? 'Profissional'}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {new Date(appointment.scheduledAt).toLocaleDateString('pt-BR')} as{' '}
              {new Date(appointment.scheduledAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            <View style={styles.appointmentActions}>
              {user?.role === 'PROFESSIONAL' && appointment.status === 'PENDING' ? (
                <Button
                  title="Aceitar"
                  variant="primary"
                  size="sm"
                  onPress={() => handleAcceptAppointment(appointment.id)}
                  style={styles.appointmentActionButton}
                />
              ) : (
                <Button
                  title="Novo agendamento"
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/appointments')}
                  style={styles.appointmentActionButton}
                />
              )}

              {user?.role !== 'PROFESSIONAL' ? (
                <Button
                  title="Cancelar"
                  variant="ghost"
                  size="sm"
                  onPress={() => handleCancelAppointment(appointment.id)}
                  style={styles.appointmentActionButton}
                  textStyle={{ color: Colors.error[500] }}
                />
              ) : null}
            </View>
          </Card>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="h4" weight="semibold">
            Historico
          </Text>
        </View>

        {pastAppointments.map((appointment) => (
          <Card key={appointment.id} style={styles.listCard}>
            <Text variant="body" weight="medium">
              {appointment.service?.title ?? 'Servico'}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {new Date(appointment.scheduledAt).toLocaleDateString('pt-BR')} as{' '}
              {new Date(appointment.scheduledAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
  },
  loginContainer: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  loginHeader: {
    height: 240,
    position: 'relative',
  },
  loginImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  loginTitleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  loginForm: {
    padding: 16,
    marginTop: -24,
  },
  loginCard: {
    padding: 24,
  },
  authTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  authTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  authTabActive: {
    backgroundColor: Colors.primary[500],
  },
  authErrorCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.error[200],
    backgroundColor: Colors.error[50],
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: Colors.neutral[900],
    fontFamily: 'Poppins-Regular',
  },
  loginButton: {
    marginTop: 8,
  },
  profileHeader: {
    backgroundColor: Colors.primary[500],
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  profileDetails: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: -24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionText: {
    marginTop: 4,
  },
  logoutIcon: {
    backgroundColor: Colors.error[50],
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error[500],
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  listCard: {
    marginBottom: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountSpacing: {
    height: 12,
  },
  refreshButton: {
    marginTop: 16,
  },
  inlineFeedbackError: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.error[200],
    backgroundColor: Colors.error[50],
  },
  inlineFeedbackSuccess: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.success[200],
    backgroundColor: Colors.success[50],
  },
  appointmentActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  appointmentActionButton: {
    marginRight: 8,
  },
});
