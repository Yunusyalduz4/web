# 🚀 Socket.io Kurulum ve Kullanım Kılavuzu

## 📋 Genel Bakış

KUADO uygulamasına **Socket.io** entegrasyonu tamamlandı! Artık tüm randevu, yorum ve işletme güncellemeleri **real-time** olarak kullanıcılara iletiliyor.

## ✨ Eklenen Özellikler

### 🔌 **Real-Time Bağlantı**
- ✅ **WebSocket** desteği
- ✅ **Fallback** polling desteği
- ✅ **Authentication** ile güvenli bağlantı
- ✅ **Room-based** mesajlaşma sistemi

### 📅 **Randevu Events**
- ✅ **Randevu oluşturuldu** → Müşteri + İşletme + Çalışan
- ✅ **Randevu durumu güncellendi** → Tüm ilgili taraflar
- ✅ **Manuel randevu oluşturuldu** → İşletme + Çalışan
- ✅ **Randevu iptal edildi** → Anında bildirim
- ✅ **Randevu tamamlandı** → Durum güncellemesi

### ⭐ **Review Events**
- ✅ **Yeni yorum eklendi** → İşletme + Müşteri
- ✅ **İşletme yanıt verdi** → Müşteri + İşletme
- ✅ **Yorum onaylandı/reddedildi** → Admin bildirimi

### 🏢 **Business Events**
- ✅ **İşletme güncellendi** → Tüm kullanıcılar
- ✅ **Hizmet eklendi/güncellendi** → İşletme çalışanları
- ✅ **Çalışan eklendi/güncellendi** → İşletme sahipleri

## 🏗️ Teknik Altyapı

### **Server Tarafı**
```typescript
// src/server/socket.ts
export class SocketServer {
  // Authentication middleware
  // Room management
  // Event emission methods
  // Connection tracking
}
```

### **Client Tarafı**
```typescript
// src/hooks/useSocket.ts
export function useSocket() {
  // Connection management
  // Event listeners
  // Room management
  // Error handling
}
```

### **API Endpoint**
```typescript
// src/pages/api/socket.ts
// Socket.io server initialization
// Next.js integration
```

## 🔧 Kurulum

### 1. **Paketler Yüklendi**
```bash
npm install socket.io socket.io-client
npm install @types/socket.io @types/socket.io-client --save-dev
```

### 2. **Server Başlatıldı**
```typescript
// Otomatik olarak /api/socket endpoint'inde başlar
const io = new SocketServer(req.socket.server);
```

### 3. **Client Hook Eklendi**
```typescript
// Herhangi bir component'te kullan
const { isConnected, events, emit } = useSocket();
```

## 📱 Kullanım

### **Temel Kullanım**
```typescript
import { useSocket } from '../hooks/useSocket';

function MyComponent() {
  const { 
    isConnected, 
    events, 
    emit, 
    joinRoom, 
    leaveRoom 
  } = useSocket();

  // Socket bağlantısı otomatik olarak başlar
  // Kullanıcı giriş yaptığında
}
```

### **Room Yönetimi**
```typescript
// İşletme odasına katıl
joinRoom(`business:${businessId}`);

// Çalışan odasına katıl
joinRoom(`employee:${employeeId}`);

// Odadan ayrıl
leaveRoom(`business:${businessId}`);
```

### **Event Dinleme**
```typescript
// Events array'inde tüm gelen event'ler
events.forEach(event => {
  console.log(`${event.type}:`, event.data);
});
```

## 🎯 Event Listesi

### **Randevu Events**
```typescript
'socket:appointment:created'           // Yeni randevu
'socket:appointment:status_updated'    // Durum güncellendi
'socket:appointment:manual_created'    // Manuel randevu
'socket:appointment:assigned'          // Çalışana atandı
'socket:appointment:cancelled'         // İptal edildi
'socket:appointment:completed'         // Tamamlandı
'socket:appointment:reminder'          // Hatırlatma
```

### **Review Events**
```typescript
'socket:review:created'                // Yeni yorum
'socket:review:replied'                // İşletme yanıtı
'socket:review:status_updated'         // Onay durumu
```

### **Business Events**
```typescript
'socket:business:updated'              // İşletme güncellendi
'socket:service:created'               // Yeni hizmet
'socket:employee:created'              // Yeni çalışan
```

## 🧪 Test Etme

### **Test Sayfası**
```
/socket-test
```

### **Test Özellikleri**
- ✅ Bağlantı durumu
- ✅ Event gönderme
- ✅ Room yönetimi
- ✅ Event listesi
- ✅ Hata gösterimi

### **Manuel Test**
```typescript
// Test mesajı gönder
emit('test:message', 'Merhaba!');

// Odaya katıl
joinRoom('business:123');

// Event'leri temizle
clearEvents();
```

## 🔒 Güvenlik

### **Authentication**
- ✅ NextAuth session kontrolü
- ✅ User role validation
- ✅ Business ownership check
- ✅ Employee verification

### **Room Access Control**
```typescript
// Sadece işletme sahibi veya admin
if (user.businessId === businessId || user.role === 'admin') {
  socket.join(`business:${businessId}`);
}
```

## 📊 Monitoring

### **Connection Tracking**
```typescript
// Bağlı kullanıcı sayısı
const userCount = socketServer.getConnectedUsersCount();

// İşletme bağlantı sayısı
const businessCount = socketServer.getBusinessConnectionsCount(businessId);
```

### **Event Logging**
```typescript
// Console'da tüm event'ler loglanır
console.log(`🔌 Socket bağlandı: ${user.name} (${user.id})`);
console.log(`📅 Randevu oluşturuldu:`, data);
```

## 🚨 Hata Yönetimi

### **Connection Errors**
```typescript
// Otomatik reconnect
// Fallback polling
// Error state management
```

### **Event Errors**
```typescript
// Event hatası ana işlemi etkilemez
// Console'da detaylı hata logları
// Graceful degradation
```

## 🔮 Gelecek Özellikler

- [ ] **Chat sistemi** (müşteri-işletme)
- [ ] **Live notifications** (browser tab)
- [ ] **Typing indicators** (yorum yazarken)
- [ ] **Presence system** (çevrimiçi durumu)
- [ ] **File sharing** (resim, dosya)
- [ ] **Voice messages** (ses kayıtları)

## 📞 Destek

### **Hata Durumları**
1. **Socket bağlanmıyor** → Console loglarını kontrol et
2. **Event gelmiyor** → Room'a katıldığından emin ol
3. **Authentication hatası** → Session'ı kontrol et

### **Debug Modu**
```typescript
// Console'da detaylı loglar
console.log('Socket events:', events);
console.log('Connection status:', isConnected);
```

---

## 🎉 **Socket.io Başarıyla Kuruldu!**

Artık KUADO uygulamasında **real-time** iletişim aktif! Tüm randevu güncellemeleri, yorumlar ve işletme değişiklikleri anında kullanıcılara iletiliyor.

**Test etmek için:** `/socket-test` sayfasını ziyaret edin!
