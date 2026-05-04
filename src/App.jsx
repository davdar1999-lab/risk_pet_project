import React, { useMemo, useState } from 'react';

const bouquets = [
  {
    id: 1,
    name: 'Cotton Candy Peonies',
    description: 'Пионовый микс в пастели с вайбом Pinterest.',
    price: 2490,
    badge: 'Trending'
  },
  {
    id: 2,
    name: 'Midnight Tulip Glow',
    description: 'Контраст тюльпанов и эвкалипта для фото в ленту.',
    price: 1990,
    badge: 'Aesthetic'
  },
  {
    id: 3,
    name: 'Soft Core Roses',
    description: 'Нежные розы с упаковкой в стиле clean girl.',
    price: 2790,
    badge: 'Best Seller'
  }
];

const formatRub = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

export default function App() {
  const [cart, setCart] = useState({});
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');

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

  return (
    <div className="page">
      <header className="hero">
        <h1>Bloom Vibe</h1>
        <p>Цветочный магазин для зумеров: стиль, эмоции и эстетика Pinterest.</p>
      </header>

      <main className="layout">
        <section className="catalog">
          {bouquets.map((bouquet) => (
            <article key={bouquet.id} className="card">
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
        </aside>
      </main>
    </div>
  );
}
