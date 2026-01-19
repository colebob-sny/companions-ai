import React, { useState, useRef } from 'react';
import Constants from 'expo-constants';
import { SafeAreaView, View, Text, TextInput, Button, FlatList, StyleSheet, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';

const detectApiUrl = () => {
  // Prefer explicit config in app.json (expo.extra.apiUrl) when available
  const configured = Constants?.expoConfig?.extra?.apiUrl;
  if (configured) return configured;

  // iOS simulator can reach localhost, Android emulator needs 10.0.2.2
  // For physical devices, replace the URL in app.json.extra.apiUrl with your machine LAN IP
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
};

const API_BASE = detectApiUrl();

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const flatRef = useRef();

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', text: userMsg.text , personalityId: 2}),
      });
      const data = await resp.json();
      const reply = (data && data.reply) || 'No reply';
      const assistMsg = { id: Date.now().toString() + '-a', role: 'assistant', text: reply };
      setMessages(prev => [...prev, assistMsg]);
    } catch (err) {
      const errMsg = { id: Date.now().toString() + '-err', role: 'assistant', text: 'Error contacting server' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.chatContainer}>
          <Text style={styles.bgText}>than.ai</Text>
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={styles.bubbleText}>{item.text}</Text>
              </View>
            )}
            contentContainerStyle={styles.chat}
            style={styles.chatList}
          />

          {loading ? <ActivityIndicator size="small" style={{ margin: 8 }} /> : null}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message"
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Button title="Send" onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chatContainer: { flex: 1, position: 'relative' },
  chatList: { zIndex: 1 },
  chat: { padding: 12 },
  bgText: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    fontSize: 72,
    color: 'rgba(0,0,0,0.06)',
    zIndex: 0,
    fontWeight: '700',
  },
  bubble: { marginVertical: 6, padding: 10, borderRadius: 8, maxWidth: '85%' },
  userBubble: { backgroundColor: '#DCF8C6', alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: '#EEE', alignSelf: 'flex-start' },
  bubbleText: { fontSize: 16 },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderColor: '#eee' },
  input: { flex: 1, marginRight: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 },
});
