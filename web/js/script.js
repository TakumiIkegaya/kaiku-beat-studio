'use strict';

(function () {
    function initializeApp() {
        // 二重初期化を防止
        if (window.__kaikuBeatStudioInitialized) return;
        window.__kaikuBeatStudioInitialized = true;

        // ========================================
        // 保存領域
        // 保存が許可されていない環境でも処理を続ける
        // ========================================
        function readStorage(storageName, key) {
            try {
                return window[storageName].getItem(key);
            } catch (error) {
                return null;
            }
        }

        function writeStorage(storageName, key, value) {
            try {
                window[storageName].setItem(key, value);
            } catch (error) {
                // 保存できない場合も画面の操作は続ける
            }
        }

        // ========================================
        // 要素の取得
        // ========================================
        const root = document.documentElement;
        const main = document.querySelector('main');
        const intro = document.getElementById('intro');

        const menuButton = document.querySelector('.material-btn');
        const hamburger = document.querySelector('.material-hamburger');
        const menuContent = document.querySelector('.material-content');

        const menuItems = menuContent
            ? menuContent.querySelectorAll('nav li')
            : [];

        const btnJa = document.getElementById('btnJa');
        const btnEn = document.getElementById('btnEn');
        const langToggleBtn = document.getElementById('langToggleBtn');
        const currentLangLabel =
            document.getElementById('currentLangLabel');

        const clock = document.getElementById('appClock');
        const stalker = document.getElementById('stalker');

        let menuOpen = false;
        let introActive = false;

        // ========================================
        // 言語辞書
        // キーはHTMLのdata-i18nと合わせる
        // ========================================
        const dictionary = {
            ja: {
                'kaiku-beat-studio': 'kaiku-beat-studio',

                'menu.あ': 'あ',
                'menu.い': 'い',
                'menu.う': 'う',
                'menu.え': 'え',

                'menu.a': 'あ',
                'menu.i': 'い',
                'menu.u': 'う',
                'menu.e': 'え',

                'splash.title': 'kaiku-beat-studio へようこそ',
                'splash.subtitle': '最新のsoundを体感しよう',

                'audio.title': '楽曲一覧',
                'audio.description': '再生ボタンで試聴できます。',
                'audio.open': '別タブで開く',
                'audio.download': 'ダウンロード',
                'audio.unsupported':
                    'お使いのブラウザは音声再生に対応していません。',
                'audio.error':
                    '再生できません。ファイルの配置・形式を確認してください。'
            },

            en: {
                'kaiku-beat-studio': 'kaiku-beat-studio',

                'menu.あ': 'a',
                'menu.い': 'i',
                'menu.う': 'u',
                'menu.え': 'e',

                'menu.a': 'a',
                'menu.i': 'i',
                'menu.u': 'u',
                'menu.e': 'e',

                'splash.title': 'Welcome to kaiku-beat-studio',
                'splash.subtitle': 'Have a nice sound experience',

                'audio.title': 'Tracks',
                'audio.description': 'Press play to listen.',
                'audio.open': 'Open in a new tab',
                'audio.download': 'Download',
                'audio.unsupported':
                    'Your browser does not support audio playback.',
                'audio.error':
                    'Unable to play. Check the file location and format.'
            }
        };

        const savedLanguage = readStorage('localStorage', 'app.lang');

        let currentLanguage =
            savedLanguage === 'ja' || savedLanguage === 'en'
                ? savedLanguage
                : (
                    (navigator.language || 'ja')
                        .toLowerCase()
                        .startsWith('ja')
                        ? 'ja'
                        : 'en'
                );

        // ========================================
        // 時計
        // 日本語：日本時間
        // 英語：米国太平洋時間
        // ========================================
        let dateFormatter = null;
        let timeFormatter = null;
        let clockTimer = null;

        function configureClock() {
            const isJapanese = currentLanguage === 'ja';

            const locale = isJapanese ? 'ja-JP' : 'en-US';
            const timeZone = isJapanese
                ? 'Asia/Tokyo'
                : 'America/Los_Angeles';

            try {
                dateFormatter = new Intl.DateTimeFormat(locale, {
                    year: 'numeric',
                    month: isJapanese ? '2-digit' : 'short',
                    day: '2-digit',
                    timeZone: timeZone
                });

                timeFormatter = new Intl.DateTimeFormat(locale, {
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: !isJapanese,
                    timeZoneName: 'short',
                    timeZone: timeZone
                });
            } catch (error) {
                dateFormatter = null;
                timeFormatter = null;
            }
        }

        function renderClock() {
            if (!clock) return;

            const now = new Date();

            if (!dateFormatter || !timeFormatter) {
                clock.textContent = now.toLocaleString();
                return;
            }

            const label =
                currentLanguage === 'ja' ? '日本時間' : 'US Time';

            clock.textContent =
                label + ' ' +
                dateFormatter.format(now) + ' ' +
                timeFormatter.format(now);
        }

        function startClock() {
            if (clockTimer !== null) {
                window.clearInterval(clockTimer);
            }

            renderClock();
            clockTimer = window.setInterval(renderClock, 1000);
        }

        // ========================================
        // メイン画面の操作可否
        // ========================================
        function updateMainInteraction() {
            if (!main) return;

            main.inert = introActive || menuOpen;
        }

        // ========================================
        // メニュー
        // ========================================
        function updateMenuLabel() {
            if (!menuButton) return;

            const label = currentLanguage === 'ja'
                ? (menuOpen ? 'メニューを閉じる' : 'メニューを開く')
                : (menuOpen ? 'Close menu' : 'Open menu');

            menuButton.setAttribute('aria-label', label);
            menuButton.setAttribute('aria-expanded', String(menuOpen));
        }

        function setMenu(open, restoreFocus) {
            if (!menuButton || !menuContent) return;

            menuOpen = Boolean(open);

            // 閉じる前に、メニュー内のフォーカスを戻す
            if (
                !menuOpen &&
                (
                    restoreFocus ||
                    menuContent.contains(document.activeElement)
                )
            ) {
                menuButton.focus();
            }

            menuButton.classList.toggle('active', menuOpen);

            if (hamburger) {
                hamburger.classList.toggle('material-close', menuOpen);
            }

            if (main) {
                main.classList.toggle('active', menuOpen);
            }

            menuContent.classList.toggle('active', menuOpen);
            menuContent.inert = !menuOpen;

            menuItems.forEach(function (item) {
                item.classList.toggle('active', menuOpen);
            });

            updateMenuLabel();
            updateMainInteraction();
        }

        if (menuButton) {
            // 元HTMLのdivにも、修正版のbuttonにも対応
            if (menuButton.tagName !== 'BUTTON') {
                menuButton.setAttribute('role', 'button');
                menuButton.setAttribute('tabindex', '0');

                menuButton.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        menuButton.click();
                    }
                });
            }

            menuButton.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();

                if (introActive) return;

                setMenu(!menuOpen, false);
            });
        }

        if (menuContent) {
            menuContent.inert = true;

            menuContent.querySelectorAll('nav a').forEach(function (link) {
                link.addEventListener('click', function (event) {
                    const href = link.getAttribute('href');

                    // 未設定のメニューでページが再読み込みされるのを防ぐ
                    if (!href || href === '#') {
                        event.preventDefault();
                    }

                    setMenu(false, true);
                });
            });
        }

        document.addEventListener('click', function (event) {
            if (!menuOpen) return;

            const target = event.target;
            if (!(target instanceof Element)) return;

            if (menuButton && menuButton.contains(target)) return;
            if (menuContent && menuContent.contains(target)) return;
            if (target.closest('.lang-switcher')) return;

            setMenu(false, false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && menuOpen) {
                setMenu(false, true);
            }
        });

        // ========================================
        // 言語切り替え
        // ========================================
        function applyLanguage(language) {
            if (language !== 'ja' && language !== 'en') return;

            currentLanguage = language;

            root.lang = language;
            root.classList.add('no-anim');
            root.classList.toggle('lang-en-mode', language === 'en');

            document.querySelectorAll('[data-i18n]').forEach(function (node) {
                const key = node.getAttribute('data-i18n');
                const text = dictionary[language][key];

                if (typeof text === 'string') {
                    node.textContent = text;
                }
            });

            const isJapanese = language === 'ja';

            if (btnJa) {
                btnJa.classList.toggle('is-active', isJapanese);
                btnJa.setAttribute('aria-pressed', String(isJapanese));
            }

            if (btnEn) {
                btnEn.classList.toggle('is-active', !isJapanese);
                btnEn.setAttribute('aria-pressed', String(!isJapanese));
            }

            if (currentLangLabel) {
                currentLangLabel.textContent = isJapanese
                    ? '現在：日本語'
                    : 'Current: English';
            }

            writeStorage('localStorage', 'app.lang', language);

            updateMenuLabel();
            configureClock();
            renderClock();

            window.requestAnimationFrame(function () {
                root.classList.remove('no-anim');
            });
        }

        if (btnJa) {
            btnJa.addEventListener('click', function (event) {
                event.preventDefault();
                applyLanguage('ja');
            });
        }

        if (btnEn) {
            btnEn.addEventListener('click', function (event) {
                event.preventDefault();
                applyLanguage('en');
            });
        }

        if (langToggleBtn) {
            langToggleBtn.addEventListener('click', function (event) {
                event.preventDefault();

                applyLanguage(
                    currentLanguage === 'ja' ? 'en' : 'ja'
                );
            });
        }

        window.addEventListener('storage', function (event) {
            if (
                event.key === 'app.lang' &&
                (event.newValue === 'ja' || event.newValue === 'en') &&
                event.newValue !== currentLanguage
            ) {
                applyLanguage(event.newValue);
            }
        });

        // ========================================
        // 初回スプラッシュ
        // 同じタブのセッション中は1回だけ表示
        // ========================================
        const introKey = 'app.intro.shown';

        function finishIntro() {
            introActive = false;

            if (intro) {
                intro.style.display = 'none';
                intro.setAttribute('aria-hidden', 'true');
            }

            if (main) {
                main.classList.add('main-ready');
            }

            updateMainInteraction();
        }

        function startIntro() {
            if (
                !intro ||
                readStorage('sessionStorage', introKey) === '1'
            ) {
                finishIntro();
                return;
            }

            introActive = true;
            updateMainInteraction();

            window.setTimeout(function () {
                intro.classList.add('intro-hide');

                window.setTimeout(function () {
                    finishIntro();
                    writeStorage('sessionStorage', introKey, '1');
                }, 600);
            }, 2500);
        }

        // ========================================
        // 音声
        // HTMLのsrcをそのまま使用
        // ========================================
        const audioPlayers = Array.from(
            document.querySelectorAll('audio')
        );

        audioPlayers.forEach(function (player) {
            const card = player.closest('.track-card');
            const errorMessage = card
                ? card.querySelector('.track-error')
                : null;

            function showError() {
                if (errorMessage) {
                    errorMessage.hidden = false;
                }
            }

            function clearError() {
                if (errorMessage) {
                    errorMessage.hidden = true;
                }
            }

            // ほかの曲との同時再生を防止
            player.addEventListener('play', function () {
                audioPlayers.forEach(function (otherPlayer) {
                    if (otherPlayer !== player) {
                        otherPlayer.pause();
                    }
                });
            });

            player.addEventListener('error', showError);
            player.addEventListener('loadeddata', clearError);
            player.addEventListener('playing', clearError);

            // source要素で読み込みに失敗した場合も表示
            player.querySelectorAll('source').forEach(function (source) {
                source.addEventListener('error', showError);
            });
        });

        // ========================================
        // カーソル追従
        // ========================================
        if (stalker) {
            document.addEventListener('mousemove', function (event) {
                stalker.style.opacity = '1';
                stalker.style.transform =
                    'translate(' +
                    event.clientX + 'px, ' +
                    event.clientY + 'px) translate(-50%, -50%)';
            });

            document.documentElement.addEventListener(
                'mouseleave',
                function () {
                    stalker.style.opacity = '0';
                }
            );
        }

        // ========================================
        // 初期表示
        // ========================================
        applyLanguage(currentLanguage);
        startClock();
        startIntro();
    }

    // 読み込み前・読み込み後、どちらで実行されても初期化する
    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initializeApp,
            { once: true }
        );
    } else {
        initializeApp();
    }
})();
