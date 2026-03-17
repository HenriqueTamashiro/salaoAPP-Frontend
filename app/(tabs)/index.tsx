import React from 'react';
import { ScrollView, View, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Calendar, Scissors, User, Star } from 'lucide-react-native';
import Text from '@/components/ui/Text';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const openProfilePanel = (panel: 'notifications' | 'account') => {
    if (!isAuthenticated) {
      router.push('/profile');
      return;
    }

    router.push(`/profile?panel=${panel}`);
  };

  const promotions = [
    {
      id: '1',
      title: 'Especial de Outono',
      description: '10% em todos os servicos de coloracao para cabelos durante o outono',
      image: '/images/promo-outono.jpg',
    },
    {
      id: '2',
      title: 'Ofertas para Novos Clientes',
      description: '30% de desconto em qualquer servico para novos clientes',
      image: '/images/newClientEdited.png',
    },
  ];

  const topServices = [
    {
      id: '1',
      title: 'Cortes',
      price: 'A partir de R$45',
      icon: <Scissors size={24} color={Colors.primary[500]} />,
    },
    {
      id: '2',
      title: 'Coloracao de Cabelo',
      price: 'A partir de R$85',
      icon: <Scissors size={24} color={Colors.primary[500]} />,
    },
    {
      id: '3',
      title: 'Manicure e Pedicure',
      price: 'A partir de R$60',
      icon: <Scissors size={24} color={Colors.primary[500]} />,
    },
    {
      id: '4',
      title: 'Dia da Noiva',
      price: 'A partir de R$200',
      icon: <Scissors size={24} color={Colors.primary[500]} />,
    },
  ];

  const featuredStylists = [
    {
      id: '1',
      name: 'Ana Carolina',
      role: 'Cabeleireira Geral',
      image: './images/personProfile.png',
      rating: 4.9,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: 'https://images.pexels.com/photos/3997391/pexels-photo-3997391.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
          style={styles.heroImage}
        />
        <View style={styles.heroContent}>
          <Text variant="h1" color="white" weight="semibold">
            Karoll Novo Estilo
          </Text>
          <Text variant="body" color="white" style={styles.heroSubtitle}>
            Onde a beleza encontra a experiencia
          </Text>
          <Button
            title="Faca um Agendamento"
            onPress={() => router.push('/appointments')}
            style={styles.heroButton}
            size="lg"
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="h3" weight="semibold">
            Novas Ofertas
          </Text>
          <TouchableOpacity>
            <Text variant="bodySmall" color="accent">
              Veja mais
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promotionsContainer}>
          {promotions.map((promo) => (
            <Card key={promo.id} style={styles.promotionCard} variant="elevated">
              <Image source={{ uri: promo.image }} style={styles.promotionImage} />
              <View style={styles.promotionContent}>
                <Text variant="h4" weight="semibold">
                  {promo.title}
                </Text>
                <Text variant="bodySmall" color="secondary" style={styles.promotionDescription}>
                  {promo.description}
                </Text>
                <Button title="Veja sobre" variant="outline" size="sm" onPress={() => {}} style={styles.promotionButton} />
              </View>
            </Card>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="h3" weight="semibold">
            Nossos Servicos
          </Text>
          <TouchableOpacity onPress={() => router.push('/services')}>
            <Text variant="bodySmall" color="accent">
              Veja mais
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesContainer}>
          {topServices.map((service) => (
            <TouchableOpacity key={service.id} style={styles.serviceCard} onPress={() => router.push('/services')}>
              <View style={styles.serviceIconContainer}>{service.icon}</View>
              <Text variant="body" weight="medium" style={styles.serviceTitle}>
                {service.title}
              </Text>
              <Text variant="bodySmall" color="secondary">
                {service.price}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="h3" weight="semibold">
            Nossos Especialistas
          </Text>
          <TouchableOpacity>
            <Text variant="bodySmall" color="accent">
              Veja mais
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stylistsContainer}>
          {featuredStylists.map((stylist) => (
            <Card key={stylist.id} style={styles.stylistCard}>
              <Image source={{ uri: stylist.image }} style={styles.stylistImage} />
              <View style={styles.stylistInfo}>
                <Text variant="body" weight="semibold">
                  {stylist.name}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {stylist.role}
                </Text>
                <View style={styles.ratingContainer}>
                  <Star size={16} color={Colors.warning[400]} fill={Colors.warning[400]} />
                  <Text variant="bodySmall" style={styles.ratingText}>
                    {stylist.rating}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
      </View>

      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/appointments')}>
          <Calendar size={24} color={Colors.primary[500]} />
          <Text variant="body" weight="medium" style={styles.quickActionText}>
            Agendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/services')}>
          <Scissors size={24} color={Colors.primary[500]} />
          <Text variant="body" weight="medium" style={styles.quickActionText}>
            Servicos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionButton} onPress={() => openProfilePanel('notifications')}>
          <Bell size={24} color={Colors.primary[500]} />
          <Text variant="body" weight="medium" style={styles.quickActionText}>
            Avisos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionButton} onPress={() => openProfilePanel('account')}>
          <User size={24} color={Colors.primary[500]} />
          <Text variant="body" weight="medium" style={styles.quickActionText}>
            Conta
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  heroContainer: {
    position: 'relative',
    height: 400,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  heroSubtitle: {
    marginBottom: 16,
  },
  heroButton: {
    marginTop: 8,
  },
  section: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  promotionsContainer: {
    paddingRight: 16,
  },
  promotionCard: {
    width: width * 0.8,
    marginRight: 16,
    padding: 0,
    overflow: 'hidden',
  },
  promotionImage: {
    width: '100%',
    height: 150,
  },
  promotionContent: {
    padding: 16,
  },
  promotionDescription: {
    marginTop: 8,
    marginBottom: 16,
  },
  promotionButton: {
    alignSelf: 'flex-start',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    textAlign: 'center',
    marginBottom: 4,
  },
  stylistsContainer: {
    paddingRight: 16,
  },
  stylistCard: {
    width: 180,
    marginRight: 16,
    padding: 0,
    overflow: 'hidden',
  },
  stylistImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  stylistInfo: {
    padding: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
    color: Colors.neutral[700],
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginVertical: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    rowGap: 12,
  },
  quickActionButton: {
    alignItems: 'center',
    width: '24%',
  },
  quickActionText: {
    marginTop: 8,
    textAlign: 'center',
  },
});
