/**
 * Бургер-навигация (ЛР 7, пункт 5).
 *
 * На узком экране меню сворачивается в кнопку: атрибут aria-expanded
 * переключает класс is-open, а CSS показывает или прячет панель.
 * Закрываем меню по клику на ссылку, по Esc и по клику мимо.
 */

export function initNav(root = document) {
    const burger = root.getElementById('burger');
    const nav = root.getElementById('site-nav');
    if (!burger || !nav) return;

    const setOpen = (open) => {
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        nav.classList.toggle('is-open', open);
    };

    burger.addEventListener('click', () => {
        setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', (event) => {
        if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setOpen(false);
    });

    document.addEventListener('click', (event) => {
        if (!nav.classList.contains('is-open')) return;
        if (nav.contains(event.target) || burger.contains(event.target)) return;
        setOpen(false);
    });
}
