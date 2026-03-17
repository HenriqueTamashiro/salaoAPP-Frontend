import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar as CalendarIcon, Check, Clock } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import {
  Professional,
  Service,
  createAppointment,
  listAvailableProfessionals,
  listServices,
} from '@/lib/api';

const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
type SlotAvailabilityMap = Record<string, Record<string, Professional[]>>;

function getDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function buildScheduledAt(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const scheduledAt = new Date(date);
  scheduledAt.setHours(hours, minutes, 0, 0);
  return scheduledAt;
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ serviceId?: string }>();
  const { accessToken, isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(params.serviceId ?? null);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isLoadingProfessionals, setIsLoadingProfessionals] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailabilityMap>({});

  const dates = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + index);
        return date;
      }),
    []
  );

  useEffect(() => {
    async function loadServices() {
      setIsLoadingServices(true);
      setError(null);

      try {
        const response = await listServices();
        setServices(response.services);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os serviços');
      } finally {
        setIsLoadingServices(false);
      }
    }

    loadServices();
  }, []);

  useEffect(() => {
    if (!selectedService) {
      setSlotAvailability({});
      setProfessionals([]);
      setSelectedDate(null);
      setSelectedTime(null);
      setSelectedProfessional(null);
      return;
    }

    let isMounted = true;
    const serviceId = selectedService;

    async function loadProfessionals() {
      setIsLoadingAvailability(true);
      setIsLoadingProfessionals(true);
      setError(null);

      try {
        const availabilityEntries = await Promise.all(
          dates.flatMap((date) =>
            timeSlots.map(async (time) => {
              const scheduledAt = buildScheduledAt(date, time);
              const response = await listAvailableProfessionals(serviceId, scheduledAt.toISOString());

              return {
                dateKey: getDateKey(date),
                time,
                professionals: response,
              };
            })
          )
        );

        if (!isMounted) return;

        const nextAvailability = availabilityEntries.reduce<SlotAvailabilityMap>((accumulator, entry) => {
          if (!accumulator[entry.dateKey]) {
            accumulator[entry.dateKey] = {};
          }

          accumulator[entry.dateKey][entry.time] = entry.professionals;
          return accumulator;
        }, {});

        setSlotAvailability(nextAvailability);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os profissionais');
      } finally {
        if (isMounted) {
          setIsLoadingAvailability(false);
          setIsLoadingProfessionals(false);
        }
      }
    }

    loadProfessionals();
    return () => {
      isMounted = false;
    };
  }, [dates, selectedService]);

  useEffect(() => {
    if (!selectedDate || !selectedTime || !selectedService) {
      setProfessionals([]);
      setSelectedProfessional(null);
      return;
    }

    const availableProfessionals = slotAvailability[getDateKey(selectedDate)]?.[selectedTime] ?? [];
    setProfessionals(availableProfessionals);

    if (!availableProfessionals.some((professional) => professional.id === selectedProfessional)) {
      setSelectedProfessional(null);
    }
  }, [selectedDate, selectedTime, selectedProfessional, selectedService, slotAvailability]);

  const selectedServiceData = services.find((item) => item.id === selectedService);

  const formatDate = (date: Date) => ({
    day: date.getDate(),
    month: date.toLocaleString('pt-BR', { month: 'short' }),
    weekday: date.toLocaleString('pt-BR', { weekday: 'short' }),
  });

  const isDateUnavailable = (date: Date) => {
    if (!selectedService) return false;

    const availabilityByTime = slotAvailability[getDateKey(date)];
    if (!availabilityByTime) return false;

    return timeSlots.every((time) => (availabilityByTime[time]?.length ?? 0) === 0);
  };

  const isTimeUnavailable = (time: string) => {
    if (!selectedService || !selectedDate) return false;

    return (slotAvailability[getDateKey(selectedDate)]?.[time]?.length ?? 0) === 0;
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedService || !selectedProfessional) {
      return;
    }

    if (!isAuthenticated || !accessToken) {
      Alert.alert('Login necessário', 'Faça login para confirmar o agendamento.');
      router.push('/profile');
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    setIsSubmitting(true);
    setError(null);

    try {
      await createAppointment(accessToken, {
        professionalId: selectedProfessional,
        serviceId: selectedService,
        scheduledAt: scheduledAt.toISOString(),
        notes: notes.trim() || undefined,
      });

      Alert.alert('Solicitacao enviada', 'Seu agendamento foi enviado para aprovacao do profissional.');
      setSelectedTime(null);
      setSelectedProfessional(null);
      setNotes('');
      router.replace('/profile');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível criar o agendamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="h2" weight="semibold">
          Faça um Agendamento
        </Text>
        <Text variant="body" color="secondary" style={styles.headerSubtitle}>
          Escolha data, horário, serviço e profissional
        </Text>
      </View>

      {error ? (
        <View style={styles.section}>
          <Card>
            <Text variant="body" color="error">
              {error}
            </Text>
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <CalendarIcon size={20} color={Colors.primary[500]} />
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            Selecione uma Data
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesContainer}>
          {dates.map((date, index) => {
            const { day, month, weekday } = formatDate(date);
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isUnavailable = isDateUnavailable(date);

            return (
              <TouchableOpacity
                key={index}
                disabled={isUnavailable}
                style={[
                  styles.dateCard,
                  isSelected && styles.dateCardSelected,
                  isUnavailable && styles.dateCardUnavailable,
                ]}
                onPress={() => {
                  if (isUnavailable) return;
                  setSelectedDate(date);
                  setSelectedTime(null);
                  setSelectedProfessional(null);
                }}
              >
                <Text
                  variant="bodySmall"
                  color={isUnavailable ? 'secondary' : isSelected ? 'white' : 'secondary'}
                  style={styles.weekday}
                >
                  {weekday}
                </Text>
                <Text
                  variant="h3"
                  weight="semibold"
                  color={isUnavailable ? 'secondary' : isSelected ? 'white' : 'primary'}
                >
                  {day}
                </Text>
                <Text variant="bodySmall" color={isUnavailable ? 'secondary' : isSelected ? 'white' : 'secondary'}>
                  {month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Check size={20} color={Colors.primary[500]} />
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            Selecione um Serviço
          </Text>
        </View>

        {isLoadingServices ? (
          <ActivityIndicator color={Colors.primary[500]} />
        ) : (
          services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, selectedService === service.id && styles.serviceCardSelected]}
              onPress={() => {
                setSelectedService(service.id);
                setSelectedTime(null);
                setSelectedProfessional(null);
              }}
            >
              <View style={styles.serviceInfo}>
                <Text
                  variant="body"
                  weight="medium"
                  color={selectedService === service.id ? 'accent' : 'primary'}
                >
                  {service.title}
                </Text>
                <View style={styles.serviceDetails}>
                  <Text variant="bodySmall" color="secondary" style={styles.serviceDetail}>
                    R$ {Number(service.price).toFixed(2)}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {service.durationMin} min
                  </Text>
                </View>
              </View>
              {selectedService === service.id ? (
                <View style={styles.checkContainer}>
                  <Check size={16} color={Colors.white} />
                </View>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </View>

      {selectedDate ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={Colors.primary[500]} />
            <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
              Selecione um Horário
            </Text>
          </View>

          {selectedService && isLoadingAvailability ? (
            <Text variant="bodySmall" color="secondary" style={styles.helperText}>
              Verificando horarios indisponiveis...
            </Text>
          ) : null}

          <View style={styles.timeContainer}>
            {timeSlots.map((time) => {
              const isUnavailable = isTimeUnavailable(time);

              return (
                <TouchableOpacity
                  key={time}
                  disabled={isUnavailable}
                  style={[
                    styles.timeCard,
                    selectedTime === time && styles.timeCardSelected,
                    isUnavailable && styles.timeCardUnavailable,
                  ]}
                  onPress={() => {
                    if (isUnavailable) return;
                    setSelectedTime(time);
                  }}
                >
                  <Text
                    variant="body"
                    color={isUnavailable ? 'secondary' : selectedTime === time ? 'white' : 'secondary'}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {selectedService && selectedDate && selectedTime ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarIcon size={20} color={Colors.primary[500]} />
            <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
              Selecione o profissional
            </Text>
          </View>

          {isLoadingProfessionals ? (
            <ActivityIndicator color={Colors.primary[500]} />
          ) : professionals.length > 0 ? (
            professionals.map((professional) => (
              <TouchableOpacity
                key={professional.id}
                style={[
                  styles.stylistCard,
                  selectedProfessional === professional.id && styles.stylistCardSelected,
                ]}
                onPress={() => setSelectedProfessional(professional.id)}
              >
                <View style={styles.stylistInfo}>
                  <Text
                    variant="body"
                    weight="medium"
                    color={selectedProfessional === professional.id ? 'accent' : 'primary'}
                  >
                    {professional.user.name}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {professional.specialties.length > 0
                      ? professional.specialties.join(', ')
                      : 'Profissional disponível'}
                  </Text>
                </View>
                {selectedProfessional === professional.id ? (
                  <View style={styles.checkContainer}>
                    <Check size={16} color={Colors.white} />
                  </View>
                ) : null}
              </TouchableOpacity>
            ))
          ) : (
            <Text variant="body" color="secondary">
              Nenhum profissional disponível para a data selecionada.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Check size={20} color={Colors.primary[500]} />
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            Observações
          </Text>
        </View>

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Algo importante para o atendimento?"
          multiline
          numberOfLines={4}
          style={styles.notesInput}
          placeholderTextColor={Colors.neutral[400]}
        />
      </View>

      {selectedDate && selectedTime && selectedServiceData && selectedProfessional ? (
        <View style={styles.bookingSection}>
          <Card style={styles.summaryCard}>
            <Text variant="h4" weight="semibold" style={styles.summaryTitle}>
              Resumo
            </Text>

            <View style={styles.summaryItem}>
              <Text variant="bodySmall" color="secondary">
                Data:
              </Text>
              <Text variant="body" weight="medium">
                {selectedDate.toLocaleDateString('pt-BR')}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text variant="bodySmall" color="secondary">
                Hora:
              </Text>
              <Text variant="body" weight="medium">
                {selectedTime}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text variant="bodySmall" color="secondary">
                Serviço:
              </Text>
              <Text variant="body" weight="medium">
                {selectedServiceData.title}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text variant="bodySmall" color="secondary">
                Profissional:
              </Text>
              <Text variant="body" weight="medium">
                {professionals.find((item) => item.id === selectedProfessional)?.user.name}
              </Text>
            </View>
          </Card>

          {!isAuthenticated ? (
            <Card style={styles.authWarningCard}>
              <Text variant="body" color="secondary">
                Entre com sua conta de cliente antes de confirmar o agendamento.
              </Text>
              <Button title="Ir para login" onPress={() => router.push('/profile')} style={styles.authButton} />
            </Card>
          ) : null}

          <Button
            title="Confirmar agendamento"
            onPress={handleBookAppointment}
            size="lg"
            style={styles.bookButton}
            isLoading={isSubmitting}
            disabled={!isAuthenticated || isSubmitting}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: Colors.white,
  },
  headerSubtitle: {
    marginTop: 8,
  },
  section: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 8,
  },
  helperText: {
    marginBottom: 12,
  },
  datesContainer: {
    paddingRight: 8,
  },
  dateCard: {
    width: 64,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  dateCardSelected: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  dateCardUnavailable: {
    backgroundColor: Colors.neutral[200],
    borderColor: Colors.neutral[300],
    opacity: 0.55,
  },
  weekday: {
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  timeCardSelected: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  timeCardUnavailable: {
    backgroundColor: Colors.neutral[200],
    borderColor: Colors.neutral[300],
    opacity: 0.55,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  serviceCardSelected: {
    borderColor: Colors.primary[500],
  },
  serviceInfo: {
    flex: 1,
  },
  serviceDetails: {
    flexDirection: 'row',
    marginTop: 4,
  },
  serviceDetail: {
    marginRight: 16,
  },
  stylistCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  stylistCardSelected: {
    borderColor: Colors.primary[500],
  },
  stylistInfo: {
    flex: 1,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingSection: {
    margin: 16,
    marginBottom: 32,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryTitle: {
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bookButton: {
    marginTop: 8,
  },
  notesInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    color: Colors.neutral[900],
    fontFamily: 'Poppins-Regular',
  },
  authWarningCard: {
    marginBottom: 16,
  },
  authButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
});


