// Скрипт для диагностики и исправления проблем с вводом
(function() {
  console.log('🔧 Запуск скрипта исправления ввода...');
  
  // Исправить все поля ввода
  function fixAllInputs() {
    const inputs = document.querySelectorAll('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    console.log('Найдено полей ввода:', inputs.length);
    
    inputs.forEach(function(input, index) {
      // Убрать все блокировки
      input.style.pointerEvents = 'auto';
      input.style.userSelect = 'text';
      input.style.webkitUserSelect = 'text';
      input.style.mozUserSelect = 'text';
      input.style.msUserSelect = 'text';
      input.style.zIndex = '9999';
      
      // Отключить автозаполнение Яндекс.Браузера
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('data-lpignore', 'true');
      input.setAttribute('data-form-type', 'other');
      input.setAttribute('data-1p-ignore', 'true');
      input.setAttribute('data-bwignore', 'true');
      
      // Убрать readonly, если не установлен явно
      if (input.hasAttribute('readonly') && !input.readOnly) {
        input.removeAttribute('readonly');
      }
      
      // Принудительно разрешить ввод - перехватываем события ДО автозаполнения
      const originalAddEventListener = input.addEventListener;
      input.addEventListener = function(type, handler, options) {
        if (type === 'keydown' || type === 'keypress' || type === 'keyup' || type === 'input') {
          // Добавляем наш обработчик с capture: true, чтобы он сработал первым
          originalAddEventListener.call(this, type, function(e) {
            // Разрешаем событие проходить дальше
            e.stopImmediatePropagation = function() {}; // Отключаем stopImmediatePropagation
            if (handler) handler(e);
          }, { capture: true, passive: true });
        }
        return originalAddEventListener.call(this, type, handler, options);
      };
      
      // Добавить явные обработчики для диагностики
      function handleKey(e) {
        console.log('Key event on input ' + index + ':', e.key, e.type, 'value:', input.value);
        // НЕ вызываем stopPropagation, чтобы события проходили
      }
      
      input.addEventListener('keydown', handleKey, { capture: false, passive: true });
      input.addEventListener('keypress', handleKey, { capture: false, passive: true });
      input.addEventListener('keyup', handleKey, { capture: false, passive: true });
      
      // Принудительно обрабатывать ввод
      input.addEventListener('input', function(e) {
        console.log('Input event on input ' + index + ':', input.value);
      }, { capture: false, passive: true });
      
      // Убедиться, что input работает
      input.addEventListener('focus', function() {
        if (document.activeElement === input) {
          console.log('Input ' + index + ' в фокусе, можно вводить');
          // Принудительно установить фокус
          setTimeout(function() {
            input.focus();
          }, 0);
        }
      }, { capture: false });
      
      // Убрать все обработчики, которые могут блокировать ввод
      const clickHandler = function(e) {
        e.stopPropagation();
        input.focus();
      };
      input.addEventListener('click', clickHandler, { capture: true });
      
      console.log('Исправлено поле ввода ' + index + ':', input);
    });
  }
  
  // Выполнить все исправления
  function run() {
    fixAllInputs();
    console.log('✅ Скрипт исправления выполнен');
  }
  
  // Выполнить сразу
  run();
  
  // Выполнить после загрузки
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  
  // Выполнять периодически
  setInterval(run, 2000);
  
  // Отключить автозаполнение на уровне документа
  document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
      form.setAttribute('autocomplete', 'off');
      form.setAttribute('data-lpignore', 'true');
    });
  });
})();

