import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Facebook, Instagram, Mail, MapPin, Phone, Clock, Twitter } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Colors from '@/constants/Colors';
import { sendContactMessage } from '@/lib/api';

export default function ContactScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const salonInfo = {
    name: 'Karoll Novo Estilo',
    address: 'Rua Artur Alvim, 141',
    phone: '(11) 98989-4471',
    email: 'estudanteana2@gmail.com',
    hours: [
      { day: 'Terça a Domingo', hours: '09:00 - 19:00' },
      { day: 'Segunda', hours: 'Fechado' },
    ],
    socialMedia: [
      {
        name: 'Instagram',
        icon: <Instagram size={24} color={Colors.primary[500]} />,
        url: 'https://www.instagram.com/hairstyleanacarolina?utm_source=qr',
      },
      { name: 'Facebook', icon: <Facebook size={24} color={Colors.primary[500]} />, url: 'https://facebook.com' },
      { name: 'X', icon: <Twitter size={24} color={Colors.primary[500]} />, url: 'https://x.com/' },
    ],
  };

  const handleCall = () => {
    Linking.openURL(`tel:${salonInfo.phone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${salonInfo.email}`);
  };

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salonInfo.address)}`;
    if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') {
      Linking.openURL(url);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || undefined,
        message: message.trim(),
      });

      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      Alert.alert('Mensagem enviada', 'Recebemos sua mensagem e responderemos em breve.');
    } catch (submitError) {
      Alert.alert(
        'Erro ao enviar',
        submitError instanceof Error ? submitError.message : 'Tente novamente em instantes.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="h2" weight="semibold">
          Nos Contate
        </Text>
        <Text variant="body" color="secondary" style={styles.headerSubtitle}>
          Adoraríamos ouvir você
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <View style={styles.map}>
          <MapPin size={48} color={Colors.primary[500]} />
          <Text variant="body" weight="medium" style={styles.mapText}>
            Mapa interativo
          </Text>
          <Text variant="bodySmall" color="secondary">
            Toque para abrir no Google Maps
          </Text>
        </View>
        <Button title="Ver no Mapa" onPress={handleGetDirections} style={styles.directionsButton} />
      </View>

      <View style={styles.section}>
        <Text variant="h3" weight="semibold" style={styles.sectionTitle}>
          Quem Somos
        </Text>

        <Card style={styles.infoCard}>
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <MapPin size={20} color={Colors.primary[500]} />
            </View>
            <View style={styles.infoContent}>
              <Text variant="bodySmall" color="secondary">
                Endereço
              </Text>
              <Text variant="body">{salonInfo.address}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.infoItem} onPress={handleCall}>
            <View style={styles.infoIconContainer}>
              <Phone size={20} color={Colors.primary[500]} />
            </View>
            <View style={styles.infoContent}>
              <Text variant="bodySmall" color="secondary">
                Telefone
              </Text>
              <Text variant="body" color="accent">
                {salonInfo.phone}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoItem} onPress={handleEmail}>
            <View style={styles.infoIconContainer}>
              <Mail size={20} color={Colors.primary[500]} />
            </View>
            <View style={styles.infoContent}>
              <Text variant="bodySmall" color="secondary">
                Email
              </Text>
              <Text variant="body" color="accent">
                {salonInfo.email}
              </Text>
            </View>
          </TouchableOpacity>
        </Card>
      </View>

      <View style={styles.section}>
        <Text variant="h3" weight="semibold" style={styles.sectionTitle}>
          Nossos Horários
        </Text>

        <Card style={styles.hoursCard}>
          <View style={styles.hoursHeader}>
            <Clock size={20} color={Colors.primary[500]} />
            <Text variant="body" weight="medium" style={styles.hoursHeaderText}>
              Horário de Funcionamento
            </Text>
          </View>

          {salonInfo.hours.map((item) => (
            <View key={item.day} style={styles.hoursItem}>
              <Text variant="body" weight="medium">
                {item.day}
              </Text>
              <Text variant="body" color={item.hours === 'Fechado' ? 'error' : 'secondary'}>
                {item.hours}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <Text variant="h3" weight="semibold" style={styles.sectionTitle}>
          Nos Siga
        </Text>

        <View style={styles.socialContainer}>
          {salonInfo.socialMedia.map((social) => (
            <TouchableOpacity
              key={social.name}
              style={styles.socialButton}
              onPress={() => Linking.openURL(social.url)}
            >
              <View style={styles.socialIcon}>{social.icon}</View>
              <Text variant="body" weight="medium">
                {social.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="h3" weight="semibold" style={styles.sectionTitle}>
          Mande uma Mensagem
        </Text>

        <Card style={styles.formCard}>
          <Text variant="body" color="secondary" style={styles.formText}>
            Tem dúvidas ou precisa entrar em contato? Envie sua mensagem e responderemos assim que possível.
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            style={styles.input}
            placeholderTextColor={Colors.neutral[400]}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Seu e-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor={Colors.neutral[400]}
          />
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Assunto"
            style={styles.input}
            placeholderTextColor={Colors.neutral[400]}
          />
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Sua mensagem"
            multiline
            numberOfLines={5}
            style={[styles.input, styles.messageInput]}
            placeholderTextColor={Colors.neutral[400]}
          />

          <Button
            title="Enviar Mensagem"
            onPress={handleSubmit}
            style={styles.contactButton}
            size="lg"
            isLoading={isSubmitting}
            disabled={!name.trim() || !email.trim() || message.trim().length < 10}
          />
        </Card>
      </View>
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
  mapContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  map: {
    height: 200,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    marginTop: 8,
  },
  directionsButton: {
    margin: 16,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  infoCard: {
    padding: 0,
  },
  infoItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  hoursCard: {
    padding: 0,
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  hoursHeaderText: {
    marginLeft: 8,
  },
  hoursItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  socialIcon: {
    marginBottom: 8,
  },
  formCard: {
    padding: 24,
  },
  formText: {
    marginBottom: 24,
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
  messageInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  contactButton: {
    alignSelf: 'center',
    minWidth: 200,
  },
});
