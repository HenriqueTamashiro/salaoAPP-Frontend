import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Text from '@/components/ui/Text';
import { RealSign } from '@/components/ui/RealSign';
import Colors from '@/constants/Colors';
import { Service, ServiceCategory, listServices } from '@/lib/api';

const categories: Array<{ id: 'all' | Lowercase<ServiceCategory>; name: string; apiCategory?: ServiceCategory }> = [
  { id: 'all', name: 'Todos os serviços' },
  { id: 'hair', name: 'Cortes', apiCategory: 'HAIR' },
  { id: 'nails', name: 'Unhas', apiCategory: 'NAILS' },
  { id: 'face', name: 'Facial', apiCategory: 'FACE' },
  { id: 'massage', name: 'Massagem', apiCategory: 'MASSAGE' },
  { id: 'makeup', name: 'Maquiagem', apiCategory: 'MAKEUP' },
];

export default function ServicesScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]['id']>('all');
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadServices() {
      setIsLoading(true);
      setError(null);

      try {
        const category = categories.find((item) => item.id === activeCategory)?.apiCategory;
        const response = await listServices(category);
        setServices(response.services);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os serviços');
      } finally {
        setIsLoading(false);
      }
    }

    loadServices();
  }, [activeCategory]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="h2" weight="semibold">
          Nossos Serviços
        </Text>
        <Text variant="body" color="secondary" style={styles.headerSubtitle}>
          Descubra a nossa gama de tratamentos de beleza
        </Text>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                activeCategory === category.id && styles.categoryButtonActive,
              ]}
              onPress={() => setActiveCategory(category.id)}
            >
              <Text
                variant="body"
                color={activeCategory === category.id ? 'white' : 'secondary'}
                weight={activeCategory === category.id ? 'medium' : 'regular'}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.servicesContainer}>
        {isLoading ? (
          <View style={styles.feedbackContainer}>
            <ActivityIndicator color={Colors.primary[500]} size="large" />
            <Text variant="body" color="secondary" style={styles.feedbackText}>
              Carregando serviços...
            </Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <Card style={styles.feedbackCard}>
            <Text variant="body" color="error">
              {error}
            </Text>
          </Card>
        ) : null}

        {!isLoading && !error && services.length === 0 ? (
          <Card style={styles.feedbackCard}>
            <Text variant="body" color="secondary">
              Nenhum serviço disponível nesta categoria no momento.
            </Text>
          </Card>
        ) : null}

        {!isLoading &&
          !error &&
          services.map((service) => (
            <Card key={service.id} style={styles.serviceCard} variant="elevated">
              <View style={styles.serviceContent}>
                <View style={styles.serviceTextContent}>
                  <Text variant="h4" weight="semibold">
                    {service.title}
                  </Text>
                  <Text variant="bodySmall" color="secondary" style={styles.serviceDescription}>
                    {service.description}
                  </Text>

                  <View style={styles.serviceMetaContainer}>
                    <View style={styles.serviceMeta}>
                      <RealSign size={16} color={Colors.neutral[600]} />
                      <Text variant="body" color="secondary" style={styles.serviceMetaText}>
                        {Number(service.price).toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.serviceMeta}>
                      <Clock size={16} color={Colors.neutral[600]} />
                      <Text variant="body" color="secondary" style={styles.serviceMetaText}>
                        {service.durationMin} min
                      </Text>
                    </View>
                  </View>

                  <Button
                    title="Agende Agora"
                    onPress={() =>
                      router.push({
                        pathname: '/appointments',
                        params: { serviceId: service.id },
                      })
                    }
                    style={styles.bookButton}
                  />
                </View>
                <Image
                  source={{
                    uri:
                      service.imageUrl ??
                      'https://images.pexels.com/photos/3993320/pexels-photo-3993320.jpeg?auto=compress&cs=tinysrgb&w=600',
                  }}
                  style={styles.serviceImage}
                />
              </View>
            </Card>
          ))}
      </ScrollView>
    </View>
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
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.neutral[100],
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary[500],
  },
  servicesContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  serviceCard: {
    marginBottom: 16,
  },
  serviceContent: {
    flexDirection: 'row',
  },
  serviceTextContent: {
    flex: 1,
    paddingRight: 8,
  },
  serviceDescription: {
    marginTop: 4,
    marginBottom: 8,
  },
  serviceMetaContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceMetaText: {
    marginLeft: 4,
  },
  serviceImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  bookButton: {
    alignSelf: 'flex-start',
  },
  feedbackContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  feedbackText: {
    marginTop: 12,
  },
  feedbackCard: {
    marginBottom: 16,
  },
});
