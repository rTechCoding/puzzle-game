 (() => {
      const board = document.getElementById('board');
      const difficulty = document.getElementById('difficulty');
      const newBtn = document.getElementById('newGame');
      const showBtn = document.getElementById('showSolution');
      const solutionImg = document.getElementById('solutionImg');
      const upload = document.getElementById('upload');

      const timerEl = document.getElementById('timer');
      const movesEl = document.getElementById('moves');
      const doneBox = document.getElementById('doneBox');
      const finalTime = document.getElementById('finalTime');
      const finalMoves = document.getElementById('finalMoves');
      const playAgain = document.getElementById('playAgain');

      let size = parseInt(difficulty.value, 10);
      let tiles = []; // tiles[position] = originalTileIndex
      let imgSrc = solutionImg.src;
      let moves = 0;
      let timer = null;
      let startTS = null;

      // drag state
      let dragFrom = null;

      function formatTime(ms) {
        const s = Math.floor(ms / 1000);
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        return `${mm}:${ss}`;
      }
      function startTimer() {
        if (timer) return;
        startTS = Date.now();
        timer = setInterval(() => {
          timerEl.textContent = formatTime(Date.now() - startTS);
        }, 250);
      }
      function stopTimer() {
        if (timer) { clearInterval(timer); timer = null; }
      }
      function resetTimer() {
        stopTimer();
        timerEl.textContent = '00:00';
        startTS = null;
      }

      function createTiles(n) {
        tiles = Array.from({ length: n }, (_, i) => i);
      }
      // Fisher-Yates shuffle (good)
      function shuffleArray(a) {
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
      }

      function newGame() {
        size = parseInt(difficulty.value, 10);
        createTiles(size * size);
        shuffleArray(tiles);
        moves = 0;
        movesEl.textContent = moves;
        resetTimer();
        doneBox.classList.remove('show');
        render();
      }

      function render() {
        board.innerHTML = '';
        board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${size}, 1fr)`;

        tiles.forEach((tileIndex, pos) => {
          const wrapper = document.createElement('div');
          wrapper.style.width = '100%';
          wrapper.style.height = '100%';
          wrapper.style.padding = '0';
          wrapper.style.boxSizing = 'border-box';

          const piece = document.createElement('div');
          piece.className = 'piece';
          piece.setAttribute('draggable', 'true');
          piece.dataset.pos = pos;
          piece.dataset.tile = tileIndex;
          // background slicing
          const r = Math.floor(tileIndex / size);
          const c = tileIndex % size;
          const x = (c / (size - 1)) * 100;
          const y = (r / (size - 1)) * 100;
          piece.style.backgroundImage = `url("${imgSrc}")`;
          piece.style.backgroundSize = `${size * 100}% ${size * 100}%`;
          piece.style.backgroundPosition = `${x}% ${y}%`;

          // desktop drag events (HTML5)
          piece.addEventListener('dragstart', e => {
            dragFrom = parseInt(piece.dataset.pos, 10);
            // make a subtle drag image to avoid default ghosting
            if (e.dataTransfer) {
              try {
                const img = new Image();
                img.src = imgSrc;
                e.dataTransfer.setDragImage(img, 0, 0);
              } catch (err) { }
              e.dataTransfer.setData('text/plain', String(dragFrom));
            }
          });
          piece.addEventListener('dragover', e => {
            e.preventDefault();
            piece.classList.add('over');
          });
          piece.addEventListener('dragleave', e => { piece.classList.remove('over'); });
          piece.addEventListener('drop', e => {
            e.preventDefault();
            piece.classList.remove('over');
            const data = e.dataTransfer && e.dataTransfer.getData && e.dataTransfer.getData('text/plain');
            const from = data !== undefined && data !== '' ? parseInt(data, 10) : dragFrom;
            const to = parseInt(piece.dataset.pos, 10);
            if (!Number.isNaN(from) && from !== to) doSwap(from, to);
            dragFrom = null;
          });

          // touch fallback (mobile): use touchend + elementFromPoint
          piece.addEventListener('touchstart', e => {
            dragFrom = parseInt(piece.dataset.pos, 10);
          }, { passive: true });
          piece.addEventListener('touchend', e => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            const target = el && el.closest('.piece');
            if (target) {
              const to = parseInt(target.dataset.pos, 10);
              if (!Number.isNaN(dragFrom) && dragFrom !== to) doSwap(dragFrom, to);
            }
            dragFrom = null;
          });

          // click fallback: pick then click to swap
          piece.addEventListener('click', () => {
            if (dragFrom === null) {
              dragFrom = parseInt(piece.dataset.pos, 10);
              piece.classList.add('over');
              setTimeout(() => piece.classList.remove('over'), 300);
            } else {
              const to = parseInt(piece.dataset.pos, 10);
              if (dragFrom !== to) doSwap(dragFrom, to);
              dragFrom = null;
            }
          });

          wrapper.appendChild(piece);
          board.appendChild(wrapper);
        });
      }

      function doSwap(a, b) {
        // start timer on first user move
        if (!timer) startTimer();

        [tiles[a], tiles[b]] = [tiles[b], tiles[a]];
        moves++;
        movesEl.textContent = moves;
        render();
        if (isSolved()) onSolved();
      }

      function isSolved() {
        for (let i = 0; i < tiles.length; i++) {
          if (tiles[i] !== i) return false;
        }
        return true;
      }

      function onSolved() {
        stopTimer();
        doneBox.classList.add('show');
        finalTime.textContent = timerEl.textContent;
        finalMoves.textContent = moves;
      }
      doneBox.addEventListener('click', (e) => {
        if (e.target === doneBox) doneBox.classList.remove('show');
      });

      // show/hide solution overlay (covers board)
      let overlay = null;
      function toggleSolution() {
        if (overlay) {
          overlay.remove();
          overlay = null;
          showBtn.textContent = 'Show Solution';
          return;
        }
        overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.inset = 0;
        overlay.style.backgroundImage = `url("${imgSrc}")`;
        overlay.style.backgroundSize = 'cover';
        overlay.style.backgroundPosition = 'center';
        overlay.style.borderRadius = '8px';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity .18s ease';
        board.appendChild(overlay);
        requestAnimationFrame(() => overlay.style.opacity = '1');
        showBtn.textContent = 'Hide Solution';
        overlay.addEventListener('click', toggleSolution);
      }

      // upload handler
      upload.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = ev => {
          imgSrc = ev.target.result;
          solutionImg.src = imgSrc;
          render();
        };
        r.readAsDataURL(f);
      });

      // controls
      newBtn.addEventListener('click', newGame);
      difficulty.addEventListener('change', newGame);
      showBtn.addEventListener('click', toggleSolution);
      playAgain.addEventListener('click', newGame);

      // init
      newGame();

      // expose for debugging if needed
      window.__puzzle = { newGame, getState: () => ({ size, tiles, moves, time: timerEl.textContent }) };

    })();