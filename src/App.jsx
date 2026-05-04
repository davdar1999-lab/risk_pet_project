import React, { useMemo, useState } from 'react';

const bouquets = [
  {
    id: 1,
    name: 'Cotton Candy Peonies',
    description: 'Пионовый микс в пастели с вайбом Pinterest.',
    price: 2490,
    badge: 'Trending',
    image:
      'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 2,
    name: 'Midnight Tulip Glow',
    description: 'Контраст тюльпанов и эвкалипта для фото в ленту.',
    price: 1990,
    badge: 'Aesthetic',
    image:
      'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 3,
    name: 'Soft Core Roses',
    description: 'Нежные розы с упаковкой в стиле clean girl.',
    price: 2790,
    badge: 'Best Seller',
    image:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80'
  }
];

const formatRub = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

export default function App() {
  const [cart, setCart] = useState({});
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [isPaid, setIsPaid] = useState(false);

  const addToCart = (id) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const items = useMemo(
    () =>
      bouquets
        .filter((b) => cart[b.id])
        .map((b) => ({ ...b, qty: cart[b.id], total: cart[b.id] * b.price })),
    [cart]
  );

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const isMasterPromo = appliedPromo.trim().toUpperCase() === 'PIRAT';
  const total = isMasterPromo ? 0 : subtotal;

  const applyPromo = () => {
    setAppliedPromo(promoCode);
  };

  const openPayment = () => {
    if (!items.length) return;
    setIsPaymentOpen(true);
  };

  const handlePay = (event) => {
    event.preventDefault();
    setIsPaid(true);
  };

  return (
    <div className="page">
      <header className="hero">
        <h1>Bloom Vibe</h1>
        <p>Наши букеты это стиль, эмоции и эстетика Pinterest.</p>
      </header>

      <main className="layout">
        <section className="catalog">
          {bouquets.map((bouquet) => (
            <article key={bouquet.id} className="card">
              <img src={bouquet.image} alt={bouquet.name} className="bouquetImage" />
              <span className="badge">{bouquet.badge}</span>
              <h2>{bouquet.name}</h2>
              <p>{bouquet.description}</p>
              <div className="cardFooter">
                <strong>{formatRub(bouquet.price)}</strong>
                <button onClick={() => addToCart(bouquet.id)}>В корзину</button>
              </div>
            </article>
          ))}
        </section>

        <aside className="cart">
          <h3>Корзина</h3>
          {items.length === 0 ? (
            <p className="empty">Добавь букет — и собери идеальный подарок ✨</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <span>{item.name}</span>
                    <small>x{item.qty}</small>
                  </div>
                  <strong>{formatRub(item.total)}</strong>
                </li>
              ))}
            </ul>
          )}

          <div className="promo">
            <label htmlFor="promo">Промокод</label>
            <div className="promoRow">
              <input
                id="promo"
                type="text"
                placeholder="Введите промокод"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button onClick={applyPromo}>Применить</button>
            </div>
            {appliedPromo && (
              <p className={isMasterPromo ? 'success' : 'info'}>
                {isMasterPromo
                  ? 'Мастер-промокод PIRAT активирован: корзина бесплатна 🏴‍☠️'
                  : `Промокод «${appliedPromo}» применён.`}
              </p>
            )}
          </div>

          <div className="summary">
            <div>
              <span>Сумма:</span>
              <strong>{formatRub(subtotal)}</strong>
            </div>
            <div>
              <span>Итого:</span>
              <strong>{formatRub(total)}</strong>
            </div>
          </div>

          <button className="payButton" onClick={openPayment}>
            Оплатить
          </button>
        </aside>
      </main>

      {isPaymentOpen && (
        <div className="modalOverlay" onClick={() => setIsPaymentOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Онлайн-оплата</h3>
            {isPaid ? (
              <div className="paidState">
                <p>Оплата прошла успешно 💖</p>
                <p>Способ получения: {deliveryType === 'delivery' ? 'Доставка' : 'Самовывоз'}.</p>
                <button onClick={() => setIsPaymentOpen(false)}>Закрыть</button>
              </div>
            ) : (
              <form onSubmit={handlePay} className="paymentForm">
                <label>
                  Номер карты
                  <input type="text" placeholder="0000 0000 0000 0000" required />
                </label>
                <div className="row2">
                  <label>
                    Срок
                    <input type="text" placeholder="MM/YY" required />
                  </label>
                  <label>
                    CVV
                    <input type="password" placeholder="***" required />
                  </label>
                </div>
                <label>
                  Имя владельца
                  <input type="text" placeholder="IVAN IVANOV" required />
                </label>

                <fieldset>
                  <legend>Получение</legend>
                  <label className="radio">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryType === 'delivery'}
                      onChange={() => setDeliveryType('delivery')}
                    />
                    Доставка курьером
                  </label>
                  <label className="radio">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryType === 'pickup'}
                      onChange={() => setDeliveryType('pickup')}
                    />
                    Самовывоз
                  </label>
                </fieldset>

                <button type="submit">Подтвердить оплату {formatRub(total)}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
