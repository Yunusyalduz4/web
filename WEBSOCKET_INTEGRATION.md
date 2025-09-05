# WebSocket Entegrasyonu - KUADO

Bu dokümantasyon, KUADO uygulamasında WebSocket entegrasyonunun nasıl çalıştığını ve nasıl kullanılacağını açıklar.

## 🚀 Genel Bakış

WebSocket entegrasyonu, uygulamanın tüm sayfalarında ve modallarında gerçek zamanlı güncellemeler sağlar. Tek bir global WebSocket bağlantısı kullanarak performansı optimize eder.

## 📁 Dosya Yapısı

```
src/
├── contexts/
│   └── WebSocketContext.tsx          # Global WebSocket Context
├── hooks/
│   ├── useWebSocketEvents.ts         # Sayfa bazlı event hooks
│   ├── useRealTimeUpdates.ts         # Gerçek zamanlı güncelleme hooks
│   └── useWebSocketOptimization.ts   # Optimizasyon hooks
└── examples/
    └── WebSocketUsageExample.tsx     # Kullanım örnekleri
```

## 🔧 Temel Kullanım

### 1. Global WebSocket Context

```tsx
import { useWebSocket } from '../contexts/WebSocketContext';

function MyComponent() {
  const { 
    socket, 
    isConnected, 
    isConnecting, 
    error, 
    emit, 
    joinRoom, 
    leaveRoom 
  } = useWebSocket();

  // WebSocket durumunu kontrol et
  if (isConnecting) return <div>Bağlanıyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div>
      <p>Durum: {isConnected ? 'Bağlı' : 'Bağlı değil'}</p>
      <button onClick={() => emit('test:message', { data: 'test' })}>
        Mesaj Gönder
      </button>
    </div>
  );
}
```

### 2. Gerçek Zamanlı Güncellemeler

```tsx
import { useRealTimeAppointments } from '../hooks/useRealTimeUpdates';

function AppointmentsPage() {
  const { setCallbacks } = useRealTimeAppointments(userId, businessId);

  useEffect(() => {
    setCallbacks({
      onAppointmentCreated: (data) => {
        console.log('Yeni randevu:', data);
        // Randevu listesini güncelle
      },
      onAppointmentUpdated: (data) => {
        console.log('Randevu güncellendi:', data);
        // Randevu listesini güncelle
      },
      onAppointmentCancelled: (data) => {
        console.log('Randevu iptal edildi:', data);
        // Randevu listesinden kaldır
      }
    });
  }, [setCallbacks]);

  return <div>Randevu Listesi</div>;
}
```

### 3. Modal İçinde WebSocket

```tsx
import { useWebSocket } from '../contexts/WebSocketContext';

function ReviewModal({ isOpen, onClose }) {
  const { emit, isConnected } = useWebSocket();

  const handleSubmitReview = (reviewData) => {
    // Yorum gönder
    if (isConnected) {
      emit('review:created', {
        businessId: reviewData.businessId,
        userId: reviewData.userId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        timestamp: new Date().toISOString()
      });
    }
  };

  return (
    <div className={isOpen ? 'modal-open' : 'modal-closed'}>
      <button 
        onClick={handleSubmitReview}
        disabled={!isConnected}
      >
        Yorum Gönder
      </button>
    </div>
  );
}
```

## 🎯 Desteklenen Event'ler

### Randevu Event'leri
- `appointment:created` - Yeni randevu oluşturuldu
- `appointment:status_updated` - Randevu durumu güncellendi
- `appointment:cancelled` - Randevu iptal edildi
- `appointment:completed` - Randevu tamamlandı
- `appointment:assigned` - Randevu atandı
- `appointment:reminder` - Randevu hatırlatması

### Yorum Event'leri
- `review:created` - Yeni yorum oluşturuldu
- `review:replied` - Yorum yanıtlandı
- `review:status_updated` - Yorum durumu güncellendi

### İşletme Event'leri
- `business:updated` - İşletme bilgileri güncellendi
- `business:approval_updated` - İşletme onay durumu güncellendi
- `service:created` - Yeni hizmet eklendi
- `service:updated` - Hizmet güncellendi
- `service:deleted` - Hizmet silindi
- `employee:created` - Yeni çalışan eklendi
- `employee:updated` - Çalışan güncellendi
- `employee:deleted` - Çalışan silindi
- `employee:availability_updated` - Çalışan müsaitlik güncellendi

### Bildirim Event'leri
- `notification:sent` - Yeni bildirim gönderildi
- `notification:read` - Bildirim okundu

## 🔄 Otomatik Güncellemeler

WebSocket entegrasyonu, aşağıdaki sayfalarda otomatik olarak çalışır:

### Kullanıcı Sayfaları
- `/dashboard/user` - Ana dashboard
- `/dashboard/user/businesses` - İşletme listesi
- `/dashboard/user/businesses/[id]` - İşletme detayı
- `/dashboard/user/favorites` - Favoriler
- `/dashboard/user/reviews` - Yorumlar

### İşletme Sayfaları
- `/dashboard/business` - İşletme dashboard
- `/dashboard/business/appointments` - Randevular
- `/dashboard/business/reviews` - Yorumlar
- `/dashboard/business/employees` - Çalışanlar
- `/dashboard/business/services` - Hizmetler

### Modallar
- `ReviewModal` - Yorum modalı
- `NotificationsModal` - Bildirim modalı
- `WeeklySlotView` - Randevu slot modalı

## ⚡ Optimizasyon

### 1. Oda Yönetimi
```tsx
import { useWebSocketOptimization } from '../hooks/useWebSocketOptimization';

function MyComponent() {
  const { optimizedJoinRoom, optimizedLeaveRoom } = useWebSocketOptimization();

  // Duplicate join'leri engeller
  optimizedJoinRoom('business:123');
  optimizedLeaveRoom('business:123');
}
```

### 2. Debounced Event'ler
```tsx
import { useDebouncedWebSocketEvent } from '../hooks/useWebSocketOptimization';

function MyComponent() {
  useDebouncedWebSocketEvent(
    'appointment:updated',
    (data) => {
      // 300ms sonra çalışır
      updateAppointmentList(data);
    },
    300
  );
}
```

### 3. Throttled Event'ler
```tsx
import { useThrottledWebSocketEvent } from '../hooks/useWebSocketOptimization';

function MyComponent() {
  useThrottledWebSocketEvent(
    'appointment:status_updated',
    (data) => {
      // Saniyede maksimum 1 kez çalışır
      updateStatus(data);
    },
    1000
  );
}
```

## 🎨 UI Göstergeleri

WebSocket durumu, tüm sayfalarda görsel olarak gösterilir:

- 🟡 **Sarı nokta** - Bağlanıyor
- 🟢 **Yeşil nokta** - Canlı bağlantı
- 🔴 **Kırmızı nokta** - Bağlantı hatası

## 🔧 Geliştirici Notları

### Yeni Event Ekleme

1. `WebSocketContext.tsx`'de event listener ekle:
```tsx
newSocket.on('socket:new:event', (data: any) => {
  console.log('Yeni event:', data);
  addEvent('new:event', data);
  triggerEventListeners('new:event', data);
});
```

2. `useWebSocketEvents.ts`'de hook oluştur:
```tsx
export function useNewEventEvents() {
  const { addEventListener, removeEventListener } = useWebSocket();
  // ... hook implementasyonu
}
```

3. `useRealTimeUpdates.ts`'de gerçek zamanlı güncelleme ekle:
```tsx
export function useRealTimeNewEvents() {
  // ... implementasyon
}
```

### Debugging

WebSocket event'lerini konsol'da görmek için:
```tsx
const { events } = useWebSocket();
console.log('WebSocket Events:', events);
```

## 🚨 Önemli Notlar

1. **Tek Bağlantı**: Uygulama genelinde sadece bir WebSocket bağlantısı kullanılır
2. **Otomatik Yeniden Bağlanma**: Bağlantı kesildiğinde otomatik olarak yeniden bağlanır
3. **Memory Management**: Event listener'lar otomatik olarak temizlenir
4. **Error Handling**: Bağlantı hataları kullanıcıya gösterilir
5. **Performance**: Debouncing ve throttling ile performans optimize edilir

## 📞 Destek

WebSocket entegrasyonu ile ilgili sorularınız için:
- Kod örnekleri: `src/examples/WebSocketUsageExample.tsx`
- Hook'lar: `src/hooks/` klasörü
- Context: `src/contexts/WebSocketContext.tsx`
