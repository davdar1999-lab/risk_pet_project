import React, { useEffect, useMemo, useState } from 'react';

const bouquets = [
  { id: 1, name: 'Cotton Candy Peonies', price: 2490, rating: 4.9, badge: 'Хит', occasion: 'birthday', day: 'today', style: 'romantic', sizeBase: 'M', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Bouquet_of_roses.jpg/1280px-Bouquet_of_roses.jpg' },
  { id: 2, name: 'Midnight Tulip Glow', price: 1990, rating: 4.7, badge: 'Сегодня', occasion: 'date', day: 'today', style: 'modern', sizeBase: 'S', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Rose_bouquet.jpg/1280px-Rose_bouquet.jpg' },
  { id: 3, name: 'Soft Core Roses', price: 2790, rating: 5.0, badge: 'Премиум', occasion: 'love', day: 'tomorrow', style: 'classic', sizeBase: 'L', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Flower_bouquet.jpg/1280px-Flower_bouquet.jpg' }
];

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

  const addToCart = (bouquet) => {
    const item = {
      uid: crypto.randomUUID(),
      bouquetId: bouquet.id,
      name: bouquet.name,
      date: date === 'all' ? 'today' : date,
      size: bouquet.sizeBase,
      basePrice: bouquet.price,
      addons: [],
      note: '',
      hidePrice: false
    };
    setCart((prev) => [...prev, item]);
    track('add_to_cart', { bouquetId: bouquet.id });
  };

  const updateItem = (uid, patch) => setCart((prev) => prev.map((x) => (x.uid === uid ? { ...x, ...patch } : x)));
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
    return { ...i, image: bouquet?.image, bouquetPrice, addonsTotal, lineTotal: bouquetPrice + addonsTotal };
  });

  const subtotal = enriched.reduce((acc, i) => acc + i.lineTotal, 0);
  const deliveryCost = deliveryType === 'delivery' ? 390 : 0;
  const isMasterPromo = appliedPromo.trim().toUpperCase() === 'PIRAT';
  const total = isMasterPromo ? 0 : subtotal + deliveryCost;

  const applyPromo = () => setAppliedPromo(promoCode);
  const openPayment = () => {
    if (!enriched.length) return;
    setIsPaymentOpen(true);
    track('payment_started', { total });
  };

  const handlePay = (event) => {
    event.preventDefault();
    setIsPaid(true);
    track('purchase_success', { total, orderId: `BV-${Math.floor(Math.random() * 90000 + 10000)}` });
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <h1>Bloom Vibe</h1>
          <p>Наши букеты это стиль, эмоции и эстетика Pinterest.</p>
          <div className="heroCta">
            <button>Подобрать букет</button>
            <button className="ghost">Доставка сегодня</button>
          </div>
        </div>
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Beautiful_bouquet_of_flowers.jpg/1280px-Beautiful_bouquet_of_flowers.jpg" alt="Эмоциональный букет" className="heroImage" referrerPolicy="no-referrer" />
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
              <img src={bouquet.image} alt={bouquet.name} className="bouquetImage" referrerPolicy="no-referrer" loading="lazy" />
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
                <img src={item.image} alt={item.name} referrerPolicy="no-referrer" loading="lazy" />
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
            {appliedPromo && <p className={isMasterPromo ? 'success' : 'info'}>{isMasterPromo ? 'Мастер-промокод PIRAT активирован: корзина бесплатна 🏴‍☠️' : `Промокод «${appliedPromo}» применён.`}</p>}
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
    </div>
  );
}
