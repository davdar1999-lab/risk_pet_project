import React, { useEffect, useMemo, useState } from 'react';

const bouquets = [
  { id: 1, name: 'Cotton Candy Peonies', price: 2490, rating: 4.9, badge: 'Хит', occasion: 'birthday', day: 'today', style: 'romantic', sizeBase: 'M', image: '/photos/client-bouquet-1.jpg', fallbackImage: '/photos/client-bouquet-1.jpg', availableDates: ['today', 'tomorrow'] },
  { id: 2, name: 'Midnight Tulip Glow', price: 1990, rating: 4.7, badge: 'Сегодня', occasion: 'date', day: 'today', style: 'modern', sizeBase: 'S', image: '/photos/client-bouquet-2.jpg', fallbackImage: '/photos/client-bouquet-2.jpg', availableDates: ['today'] },
  { id: 3, name: 'Soft Core Roses', price: 2790, rating: 5.0, badge: 'Премиум', occasion: 'love', day: 'tomorrow', style: 'classic', sizeBase: 'L', image: '/photos/client-bouquet-3.jpg', fallbackImage: '/photos/client-bouquet-3.jpg', availableDates: ['tomorrow'] }
];

// Mock API для проверки доступности товаров (БТ 12.3.7)
// Митигация риска TECHNICAL: добавлена обработка ошибок API и fallback-логика
const checkProductAvailability = (productId, date) => {
  return new Promise((resolve, reject) => {
    // Симуляция возможной ошибки API (для демонстрации offline-режима)
    const shouldSimulateError = Math.random() < 0.1; // 10% шанс ошибки
    
    setTimeout(() => {
      if (shouldSimulateError) {
        reject(new Error('API timeout'));
        return;
      }
      
      const bouquet = bouquets.find((b) => b.id === productId);
      if (!bouquet) {
        resolve({ isAvailable: false, reason: 'not_found', availableDeliveryDates: [] });
        return;
      }
      const isAvailable = bouquet.availableDates.includes(date);
      resolve({
        isAvailable,
        reason: isAvailable ? undefined : 'out_of_stock',
        availableDeliveryDates: bouquet.availableDates,
        alternatives: isAvailable ? [] : bouquets.filter((b) => b.availableDates.includes(date) && b.id !== productId).map((b) => ({ ...b, isAlternative: true }))
      });
    }, 300);
  });
};

// Mock API для проверки всей корзины (БТ 12.3.7)
const checkCartAvailability = async (cartItems) => {
  const results = await Promise.all(
    cartItems.map((item) => 
      checkProductAvailability(item.bouquetId, item.date)
        .then((res) => ({ ...res, uid: item.uid, name: item.name }))
        .catch((error) => {
          // При ошибке API — возвращаем статус offline
          return { 
            isAvailable: true, 
            isOffline: true, 
            reason: 'api_unavailable',
            uid: item.uid, 
            name: item.name 
          };
        })
    )
  );
  return results;
};

const addons = [
  { id: 'vase', title: 'Ваза', price: 790 },
  { id: 'choco', title: 'Шоколад', price: 490 },
  { id: 'card', title: 'Открытка', price: 190 }
];

const formatRub = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
const sizeMultiplier = { S: 1, M: 1.25, L: 1.5 };

const track = (event, payload = {}) => {
  console.log('[analytics]', event, payload);
};

export default function App() {
  const [city, setCity] = useState('Москва');
  const [date, setDate] = useState('today');
  const [occasion, setOccasion] = useState('all');
  const [maxPrice, setMaxPrice] = useState(5000);

  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('bloom-cart') || '[]'));
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [isPaid, setIsPaid] = useState(false);
  
  // Состояния для проверки доступности (БТ 12.3.6)
  const [availabilityStatus, setAvailabilityStatus] = useState({}); // { uid: { isAvailable, reason, alternatives } }
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState(null); // { uid, replacementBouquet }
  
  // Митигация риска OPERATIONAL: offline-режим с ручной проверкой
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => track('view_homepage'), []);
  useEffect(() => localStorage.setItem('bloom-cart', JSON.stringify(cart)), [cart]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('occasion', occasion);
    params.set('date', date);
    params.set('maxPrice', String(maxPrice));
    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [occasion, date, maxPrice]);

  const filtered = useMemo(() => {
    track('view_catalog', { city, date, occasion, maxPrice });
    return bouquets.filter((b) => b.price <= maxPrice && (occasion === 'all' || b.occasion === occasion) && (date === 'all' || b.day === date));
  }, [city, date, occasion, maxPrice]);

  const addToCart = async (bouquet) => {
    const selectedDate = date === 'all' ? 'today' : date;
    
    // БТ 12.3.6: Проверка доступности при добавлении в корзину
    setIsCheckingAvailability(true);
    try {
      const availability = await checkProductAvailability(bouquet.id, selectedDate);
      
      if (!availability.isAvailable) {
        // Товар недоступен на выбранную дату — показать альтернативы
        setSelectedReplacement({
          uid: null, // новый товар
          originalBouquet: bouquet,
          alternatives: availability.alternatives,
          selectedDate
        });
        track('add_to_cart_availability_error', { bouquetId: bouquet.id, date: selectedDate, reason: availability.reason });
        return; // Не добавлять в корзину
      }
      
      // Товар доступен — добавляем в корзину
      const item = {
        uid: crypto.randomUUID(),
        bouquetId: bouquet.id,
        name: bouquet.name,
        date: selectedDate,
        size: bouquet.sizeBase,
        basePrice: bouquet.price,
        addons: [],
        note: '',
        hidePrice: false
      };
      setCart((prev) => [...prev, item]);
      track('add_to_cart', { bouquetId: bouquet.id });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const updateItem = async (uid, patch) => {
    // БТ 12.3.6: Проверка доступности при изменении даты доставки
    if (patch.date) {
      setIsCheckingAvailability(true);
      try {
        const item = cart.find((x) => x.uid === uid);
        if (!item) return;
        
        const availability = await checkProductAvailability(item.bouquetId, patch.date);
        
        if (!availability.isAvailable) {
          // Товар недоступен на новую дату — показать альтернативы
          setSelectedReplacement({
            uid,
            originalBouquet: item,
            alternatives: availability.alternatives,
            selectedDate: patch.date
          });
          track('delivery_date_availability_error', { uid, bouquetId: item.bouquetId, date: patch.date, reason: availability.reason });
          return; // Не применять изменение
        }
      } finally {
        setIsCheckingAvailability(false);
      }
    }
    
    setCart((prev) => prev.map((x) => (x.uid === uid ? { ...x, ...patch } : x)));
  };
  const toggleAddon = (uid, addon) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item;
        const exists = item.addons.find((a) => a.id === addon.id);
        const nextAddons = exists ? item.addons.filter((a) => a.id !== addon.id) : [...item.addons, addon];
        track('add_on_changed', { uid, addon: addon.id, enabled: !exists });
        return { ...item, addons: nextAddons };
      })
    );
  };

  const enriched = cart.map((i) => {
    const bouquet = bouquets.find((b) => b.id === i.bouquetId);
    const bouquetPrice = Math.round(i.basePrice * sizeMultiplier[i.size]);
    const addonsTotal = i.addons.reduce((acc, a) => acc + a.price, 0);
    return { ...i, image: bouquet?.image, fallbackImage: bouquet?.fallbackImage, bouquetPrice, addonsTotal, lineTotal: bouquetPrice + addonsTotal };
  });

  const subtotal = enriched.reduce((acc, i) => acc + i.lineTotal, 0);
  const deliveryCost = deliveryType === 'delivery' ? 390 : 0;
  
  // Митигация риска CONDUCT: удален мастер-промокод PIRAT
  // Промокоды должны валидироваться на сервере с проверкой:
  // - срока действия, минимальной суммы, максимального размера скидки
  // - количества применений, whitelist пользователей
  // Запрещены промокоды со 100% скидкой без явных ограничений
  const isMasterPromo = false; // PIRAT промокод удален из кода
  const total = isMasterPromo ? 0 : subtotal + deliveryCost;

  const applyPromo = () => setAppliedPromo(promoCode);
  
  // БТ 12.3.6: Финальная проверка доступности перед оплатой
  // Митигация риска OPERATIONAL: обработка offline-режима
  const openPayment = async () => {
    if (!enriched.length) return;

    setIsCheckingAvailability(true);
    try {
      const availabilityResults = await checkCartAvailability(enriched);
      
      // Проверка на offline-режим (ошибки API)
      const hasOfflineItems = availabilityResults.some((r) => r.isOffline);
      if (hasOfflineItems) {
        setIsOfflineMode(true);
        setApiError('api_unavailable');
        track('api_availability_offline_mode_entered');
        // Не блокируем оплату — разрешаем checkout с ручной проверкой
        // Пользователь видит banner и может продолжить
      }
      
      // Проверка на реально недоступные товары (не offline)
      const hasUnavailable = availabilityResults.some((r) => !r.isAvailable && !r.isOffline);

      if (hasUnavailable) {
        // Найти первый недоступный товар и показать альтернативы
        const unavailable = availabilityResults.find((r) => !r.isAvailable && !r.isOffline);
        const item = enriched.find((i) => i.uid === unavailable.uid);
        setSelectedReplacement({
          uid: unavailable.uid,
          originalBouquet: item,
          alternatives: unavailable.alternatives,
          selectedDate: item.date,
          isCheckoutBlock: true // Блокировать оплату до решения
        });
        track('checkout_availability_error', { uid: unavailable.uid, bouquetId: item.bouquetId, reason: unavailable.reason });
        return; // Не открывать оплату
      }

      setIsPaymentOpen(true);
      track('payment_started', { total, isOfflineMode: hasOfflineItems });
    } catch (error) {
      // Критическая ошибка API — переход в offline-режим
      setIsOfflineMode(true);
      setApiError('api_error');
      track('api_availability_offline_mode_entered', { error: error.message });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handlePay = (event) => {
    event.preventDefault();
    setIsPaid(true);
    track('purchase_success', { total, orderId: `BV-${Math.floor(Math.random() * 90000 + 10000)}` });
  };

  // Митигация риска OPERATIONAL: обработка offline-режима
  const handleRetryApi = () => {
    setIsOfflineMode(false);
    setApiError(null);
    track('api_retry_clicked');
  };

  return (
    <div className="page">
      {/* Митигация риска OPERATIONAL: banner offline-режима */}
      {isOfflineMode && (
        <div className="offlineBanner">
          <p>⚠️ Временная проблема с проверкой доступности</p>
          <p>Мы не можем проверить наличие товаров в реальном времени. Оформите заказ — менеджер свяжется в течение 15 минут для подтверждения.</p>
          <div className="bannerActions">
            <button onClick={() => setIsOfflineMode(false)}>Продолжить заказ</button>
            <button className="ghost" onClick={handleRetryApi}>Попробовать снова</button>
          </div>
        </div>
      )}
      
      <header className="hero">
        <div>
          <h1>Bloom Vibe</h1>
          <p>Наши букеты это стиль, эмоции и эстетика Pinterest.</p>
          <div className="heroCta">
            <button>Подобрать букет</button>
            <button className="ghost">Доставка сегодня</button>
          </div>
        </div>
        <img src="/photos/client-bouquet-1.jpg" alt="Эмоциональный букет" className="heroImage" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/photos/client-bouquet-1.jpg"; }} />
      </header>

      <section className="controls">
        <select value={city} onChange={(e) => setCity(e.target.value)}><option>Москва</option><option>Санкт-Петербург</option><option>Казань</option></select>
        <select value={date} onChange={(e) => { setDate(e.target.value); track('apply_filter', { type: 'date', value: e.target.value }); }}>
          <option value="all">Любая дата</option><option value="today">Сегодня</option><option value="tomorrow">Завтра</option>
        </select>
        <select value={occasion} onChange={(e) => { setOccasion(e.target.value); track('apply_filter', { type: 'occasion', value: e.target.value }); }}>
          <option value="all">Любой повод</option><option value="birthday">День рождения</option><option value="date">Свидание</option><option value="love">Любовь</option>
        </select>
        <label className="range">до {formatRub(maxPrice)}<input type="range" min="1500" max="10000" step="100" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} /></label>
      </section>

      <main className="layout">
        <section className="catalog">
          {filtered.length === 0 ? <p className="emptyState">Ничего не найдено. Измени фильтры.</p> : filtered.map((bouquet) => (
            <article key={bouquet.id} className="card">
              <img src={bouquet.image} alt={bouquet.name} className="bouquetImage" referrerPolicy="no-referrer" loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = bouquet.fallbackImage; }} />
              <span className="badge">{bouquet.badge}</span>
              <h2>{bouquet.name}</h2>
              <p>⭐ {bouquet.rating}</p>
              <div className="cardFooter"><strong>{formatRub(bouquet.price)}</strong><button onClick={() => addToCart(bouquet)}>В корзину</button></div>
            </article>
          ))}
        </section>

        <aside className="cart">
          <h3>Корзина</h3>
          {enriched.length === 0 ? <p className="empty">Добавь букет — и собери идеальный подарок ✨</p> : (
            <ul>{enriched.map((item) => (
              <li key={item.uid} className="cartItem">
                <img src={item.image} alt={item.name} referrerPolicy="no-referrer" loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = item.fallbackImage; }} />
                <div>
                  <span>{item.name}</span>
                  <select value={item.size} onChange={(e) => updateItem(item.uid, { size: e.target.value })}><option>S</option><option>M</option><option>L</option></select>
                  <select value={item.date} onChange={(e) => { updateItem(item.uid, { date: e.target.value }); track('delivery_date_selected', { date: e.target.value }); }}><option value="today">Сегодня</option><option value="tomorrow">Завтра</option></select>
                  <input placeholder="Текст открытки (до 300)" maxLength={300} value={item.note} onChange={(e) => updateItem(item.uid, { note: e.target.value })} />
                  <small>{item.note.length}/300</small>
                  <label className="radio"><input type="checkbox" checked={item.hidePrice} onChange={(e) => updateItem(item.uid, { hidePrice: e.target.checked })} />Скрыть цену от получателя</label>
                  <div className="addons">{addons.map((a) => <button key={a.id} className={item.addons.find((x) => x.id === a.id) ? 'addOn active' : 'addOn'} onClick={() => toggleAddon(item.uid, a)}>{a.title} +{formatRub(a.price)}</button>)}</div>
                </div>
                <strong>{formatRub(item.lineTotal)}</strong>
              </li>
            ))}</ul>
          )}

          <div className="promo">
            <label htmlFor="promo">Промокод</label>
            <div className="promoRow"><input id="promo" type="text" placeholder="Введите промокод" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} /><button onClick={applyPromo}>Применить</button></div>
            {appliedPromo && <p className="info">Промокод «{appliedPromo}» применён.</p>}
          </div>

          <div className="summary"><div><span>Товары:</span><strong>{formatRub(subtotal)}</strong></div><div><span>Доставка:</span><strong>{formatRub(deliveryCost)}</strong></div><div><span>Итого:</span><strong>{formatRub(total)}</strong></div></div>
          <button className="payButton" onClick={openPayment}>Оплатить</button>
        </aside>
      </main>

      <section className="extraBlocks">
        <div><h3>Гарантии</h3><p>Свежесть 5 дней, фото перед отправкой, возврат при браке.</p></div>
        <div><h3>Отзывы</h3><p>4.9/5 на основе 8 000+ заказов.</p></div>
        <div><h3>FAQ</h3><p>Доставляем сегодня за 2 часа, работаем 24/7.</p></div>
      </section>

      {isPaymentOpen && (
        <div className="modalOverlay" onClick={() => setIsPaymentOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Checkout: получатель → доставка → подарок → оплата</h3>
            {isPaid ? <div className="paidState"><p>Оплата прошла успешно 💖</p><p>Номер заказа: BV-{Math.floor(Math.random() * 90000 + 10000)}</p><button onClick={() => setIsPaymentOpen(false)}>Закрыть</button></div> : (
              <form onSubmit={handlePay} className="paymentForm">
                <input type="text" placeholder="Имя получателя" required autoComplete="name" />
                <input type="tel" placeholder="Телефон" required autoComplete="tel" />
                <input type="text" placeholder="Адрес доставки" required autoComplete="street-address" />
                <div className="row2"><input type="text" placeholder="0000 0000 0000 0000" required /><input type="text" placeholder="MM/YY CVV" required /></div>
                <fieldset><legend>Получение</legend><label className="radio"><input type="radio" name="delivery" checked={deliveryType === 'delivery'} onChange={() => setDeliveryType('delivery')} />Доставка</label><label className="radio"><input type="radio" name="delivery" checked={deliveryType === 'pickup'} onChange={() => setDeliveryType('pickup')} />Самовывоз</label></fieldset>
                <button type="submit">Подтвердить оплату {formatRub(total)}</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal замены недоступного товара (БТ 12.3.2) */}
      {selectedReplacement && (
        <div className="modalOverlay" onClick={() => !selectedReplacement.isCheckoutBlock && setSelectedReplacement(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {selectedReplacement.isCheckoutBlock 
                ? 'Товар недоступен — выберите замену перед оплатой' 
                : 'Товар недоступен на выбранную дату'}
            </h3>
            <div className="availabilityAlert">
              <p><strong>{selectedReplacement.originalBouquet?.name}</strong> недоступен на {selectedReplacement.selectedDate === 'today' ? 'сегодня' : selectedReplacement.selectedDate === 'tomorrow' ? 'завтра' : selectedReplacement.selectedDate}.</p>
              <p>Причина: {selectedReplacement.originalBouquet?.availableDates?.includes(selectedReplacement.selectedDate) ? 'товар закончился' : 'не доставляется на эту дату'}</p>
            </div>
            
            {selectedReplacement.alternatives && selectedReplacement.alternatives.length > 0 ? (
              <div>
                <h4>Альтернативные варианты:</h4>
                <div className="alternativesGrid">
                  {selectedReplacement.alternatives.map((alt) => (
                    <div key={alt.id} className="card alternativeCard">
                      <img src={alt.image} alt={alt.name} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = alt.fallbackImage; }} />
                      <span className="badge">Аналог</span>
                      <h4>{alt.name}</h4>
                      <p>⭐ {alt.rating}</p>
                      <p><strong>{formatRub(alt.price)}</strong></p>
                      <button onClick={() => {
                        if (selectedReplacement.uid) {
                          // Замена существующего товара в корзине
                          setCart((prev) => prev.map((item) => 
                            item.uid === selectedReplacement.uid 
                              ? { ...item, bouquetId: alt.id, name: alt.name, basePrice: alt.price }
                              : item
                          ));
                        } else {
                          // Добавление нового товара вместо недоступного
                          const newItem = {
                            uid: crypto.randomUUID(),
                            bouquetId: alt.id,
                            name: alt.name,
                            date: selectedReplacement.selectedDate,
                            size: alt.sizeBase,
                            basePrice: alt.price,
                            addons: [],
                            note: '',
                            hidePrice: false
                          };
                          setCart((prev) => [...prev, newItem]);
                        }
                        setSelectedReplacement(null);
                        track('replacement_selected', { 
                          originalBouquetId: selectedReplacement.originalBouquet?.id, 
                          replacementBouquetId: alt.id,
                          isCheckoutBlock: selectedReplacement.isCheckoutBlock 
                        });
                      }}>Выбрать эту замену</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="emptyState">К сожалению, нет доступных альтернатив на эту дату.</p>
            )}
            
            <div className="modalActions">
              {selectedReplacement.uid && (
                <button 
                  className="ghost" 
                  onClick={() => {
                    setCart((prev) => prev.filter((item) => item.uid !== selectedReplacement.uid));
                    setSelectedReplacement(null);
                    track('unavailable_item_removed', { uid: selectedReplacement.uid, bouquetId: selectedReplacement.originalBouquet?.id });
                  }}
                >
                  Удалить из корзины
                </button>
              )}
              <button 
                className="ghost" 
                onClick={() => {
                  setSelectedReplacement(null);
                  track('replacement_modal_closed', { isCheckoutBlock: selectedReplacement.isCheckoutBlock });
                }}
                disabled={selectedReplacement.isCheckoutBlock}
              >
                {selectedReplacement.isCheckoutBlock ? 'Выберите замену' : 'Отмена'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Индикатор проверки доступности */}
      {isCheckingAvailability && (
        <div className="availabilityChecking">
          <div className="spinner" />
          <p>Проверяем доступность товаров...</p>
        </div>
      )}
    </div>
  );
}
