# Carousel Auto-Slide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add infinite auto-sliding to the announcements carousel, advancing every 4 seconds and looping back to the first item after the last.

**Architecture:** Add a `Timer.periodic` inside `_AnnouncementsWidgetState` that increments a tracked index with modulo wrap-around and drives `CarouselController.animateToItem`. The timer is guarded against single-item lists and is cancelled in `dispose`.

**Tech Stack:** Flutter 3.7+, `dart:async` Timer, Flutter Material `CarouselView` / `CarouselController`

---

### Task 1: Add auto-slide timer to `AnnouncementsWidget`

**Files:**
- Modify: `mobile-app/lib/features/home/carousel/carousel_widget.dart`

- [ ] **Step 1: Import `dart:async`**

The file already imports `dart:ui`. Add `dart:async` below it:

```dart
import 'dart:async';
import 'dart:ui';
```

- [ ] **Step 2: Add `_currentIndex` and `_autoSlideTimer` fields to `_AnnouncementsWidgetState`**

Add these two fields right after the `_carouselController` declaration (line 18):

```dart
final CarouselController _carouselController = CarouselController();
int _currentIndex = 0;
Timer? _autoSlideTimer;
```

- [ ] **Step 3: Add `_startAutoSlide` helper method**

Add this method inside `_AnnouncementsWidgetState`, before `didChangeDependencies`:

```dart
void _startAutoSlide() {
  if (widget.items.length <= 1) return;
  _autoSlideTimer = Timer.periodic(const Duration(seconds: 4), (_) {
    _currentIndex = (_currentIndex + 1) % widget.items.length;
    _carouselController.animateToItem(
      _currentIndex,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeInOut,
    );
  });
}
```

- [ ] **Step 4: Start the timer in `initState`**

Add `initState` override right before `didChangeDependencies`:

```dart
@override
void initState() {
  super.initState();
  _startAutoSlide();
}
```

- [ ] **Step 5: Cancel the timer in `dispose`**

Add `dispose` override after `initState`:

```dart
@override
void dispose() {
  _autoSlideTimer?.cancel();
  super.dispose();
}
```

- [ ] **Step 6: Verify the full state class looks correct**

The top of `_AnnouncementsWidgetState` should now read:

```dart
class _AnnouncementsWidgetState extends State<AnnouncementsWidget> {
  final CarouselController _carouselController = CarouselController();
  int _currentIndex = 0;
  Timer? _autoSlideTimer;

  @override
  void initState() {
    super.initState();
    _startAutoSlide();
  }

  @override
  void dispose() {
    _autoSlideTimer?.cancel();
    super.dispose();
  }

  void _startAutoSlide() {
    if (widget.items.length <= 1) return;
    _autoSlideTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      _currentIndex = (_currentIndex + 1) % widget.items.length;
      _carouselController.animateToItem(
        _currentIndex,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void didChangeDependencies() {
    // ... rest unchanged
  }
  // ... rest of class unchanged
}
```

- [ ] **Step 7: Run static analysis**

```bash
cd mobile-app && flutter analyze lib/features/home/carousel/carousel_widget.dart
```

Expected: no issues or only pre-existing warnings unrelated to this file.

- [ ] **Step 8: Manually test on device/simulator**

```bash
cd mobile-app && flutter run
```

- Navigate to the Home screen.
- Verify slides advance automatically every ~4 seconds.
- Verify that after the last slide it loops back to the first.
- Verify a single-item carousel does not crash or flicker.

- [ ] **Step 9: Commit**

```bash
cd mobile-app
git add lib/features/home/carousel/carousel_widget.dart
git commit -m "feat: add infinite auto-slide to announcements carousel (4s interval)"
cd ..
git add mobile-app
git commit -m "chore: update mobile-app submodule — carousel auto-slide"
```
