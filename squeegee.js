'use strict';

var Squeegee = function Squeegee(element) {
  if (!element) return;
  
  var $element = this.$element = $(element);
  var element = this.element = $element[0];
  
  var squeegee = element.squeegee;
  if (squeegee) return squeegee;
  
  element.squeegee = this;
  
  this._offset = { x: 0, y: 0 };
  this._scale = 1;
  this._rotation = 0;
  
  var isTouchSupported = !!('ontouchstart' in window);
  
  var lastTouchA = null;
  var lastTouchB = null;
  
  var getNewTouchA = function(touches) {
    if (!lastTouchA) return null;
    for (var i = 0, length = touches.length, touch; i < length; i++) {
      touch = touches[i];
      if (touch.identifier === lastTouchA.identifier) return touch;
    }
    return null;
  };
  
  var getNewTouchB = function(touches) {
    if (!lastTouchB) return null;
    for (var i = 0, length = touches.length, touch; i < length; i++) {
      touch = touches[i];
      if (touch.identifier === lastTouchB.identifier) return touch;
    }
    return null;
  };
  
  var setLastTouchA = function(touch) {
    lastTouchA = (touch) ? {
      identifier: touch.identifier,
      pageX: touch.pageX,
      pageY: touch.pageY
    } : null;
  };
  
  var setLastTouchB = function(touch) {
    lastTouchB = (touch) ? {
      identifier: touch.identifier,
      pageX: touch.pageX,
      pageY: touch.pageY
    } : null;
  };
  
  var getDeltaTranslation = function(touchA, touchB) {
    var x = 0, y = 0;
    
    // Handle translating with two touches.
    if (touchA && lastTouchA && touchB && lastTouchB) {
      x = ((touchA.pageX + touchB.pageX) / 2) - ((lastTouchA.pageX + lastTouchB.pageX) / 2);
      y = ((touchA.pageY + touchB.pageY) / 2) - ((lastTouchA.pageY + lastTouchB.pageY) / 2);
    }
    
    // Handle translating with one touch.
    else if (touchA && lastTouchA) {
      x = touchA.pageX - lastTouchA.pageX;
      y = touchA.pageY - lastTouchA.pageY;
    }
    
    return { x: x, y: y };
  };
  
  var getDeltaScale = function(touchA, touchB) {
    if (!touchA || !lastTouchA || !touchB || !lastTouchB) return 0;
    
    var oldDistance = Math.sqrt(Math.pow(lastTouchB.pageX - lastTouchA.pageX, 2) + Math.pow(lastTouchB.pageY - lastTouchA.pageY, 2));
    var newDistance = Math.sqrt(Math.pow(touchB.pageX - touchA.pageX, 2) + Math.pow(touchB.pageY - touchA.pageY, 2));
    return newDistance - oldDistance;
  };
  
  var getDeltaRotation = function(touchA, touchB) {
    if (!touchA || !lastTouchA || !touchB || !lastTouchB) return 0;
    
    var oldAngle = (Math.atan2(lastTouchB.pageY - lastTouchA.pageY, lastTouchB.pageX - lastTouchA.pageX) / Math.PI) * 180;
    var newAngle = (Math.atan2(touchB.pageY - touchA.pageY, touchB.pageX - touchA.pageX) / Math.PI) * 180;
    return newAngle - oldAngle;
  };
  
  var isTranslating = false;
  var isScaling = false;
  
  var self = this;
  
  $element.bind(isTouchSupported ? 'touchstart' : 'mousedown', function(evt) {
    var touch = isTouchSupported ? evt.originalEvent.changedTouches[0] : evt;
    
    if (!isScaling && isTranslating) {
      isScaling = true;
      setLastTouchB(touch);
    }
    
    if (!isTranslating) {
      isTranslating = true;
      setLastTouchA(touch);
    }
        
    evt.preventDefault();
  });

  $(window).bind(isTouchSupported ? 'touchmove' : 'mousemove', function(evt) {
    if (!isTranslating && !isScaling) return;

    var touches = isTouchSupported && evt.originalEvent.touches;
    var touchA = isTouchSupported ? getNewTouchA(touches) : evt;
    var touchB = isTouchSupported ? getNewTouchB(touches) : null;
    
    // Handle translating.
    if (isTranslating) { 
      var deltaTranslation = (isScaling) ? getDeltaTranslation(touchA, touchB) : getDeltaTranslation(touchA);
      var offset = self.getOffset();
      offset.x += deltaTranslation.x;
      offset.y += deltaTranslation.y;
      self.setOffset(offset);
    }
    
    // Handle scaling and rotation.
    if (isScaling) {
      var deltaScale = getDeltaScale(touchA, touchB);
      var minimumScale = self.getMinimumScale();
      var maximumScale = self.getMaximumScale();
      var scale = self.getScale();
      scale *= 1 + (deltaScale / 100);
      self.setScale(scale);
      
      var deltaRotation = getDeltaRotation(touchA, touchB);
      var rotation = self.getRotation();
      rotation += deltaRotation;
      self.setRotation(rotation);
    }
    
    setLastTouchA(touchA);
    setLastTouchB(touchB);
  });
  
  $(window).bind(isTouchSupported ? 'touchend touchcancel' : 'mouseup', function(evt) {
    var touches = isTouchSupported && evt.originalEvent.touches;
    var touchA = isTouchSupported ? getNewTouchA(touches) : evt;
    var touchB = isTouchSupported ? getNewTouchB(touches) : null;
    
    if (isTranslating && (!touchA || !isTouchSupported)) {
      isTranslating = false;
      self.redraw();
    }
    
    if (isScaling && (!touchA || !touchB)) {
      isScaling = false;
      self.redraw();
    }
    
    setLastTouchA(touchA);
    setLastTouchB(touchB);
  });
};

Squeegee.prototype = {
  constructor: Squeegee,
  
  element: null,
  $element: null,
  
  update: function() {
    var offset = this.getOffset();
    var scale = this.getScale();
    var rotation = this.getRotation();
    this.$element.css('-webkit-transform', 'translate3d(' + offset.x + 'px, ' + offset.y + 'px, 0px) scale3d(' + scale + ', ' + scale + ', 1) rotate3d(0, 0, 1, ' + rotation + 'deg)');
  },
  
  redraw: function() {
    var offset = this.getOffset();
    var scale = this.getScale();
    var rotation = this.getRotation();
    this.$element.css('-webkit-transform', 'translate(' + offset.x + 'px, ' + offset.y + 'px) scale(' + scale + ', ' + scale + ') rotate(' + rotation + 'deg)');
  },
  
  _offset: null,
  
  getOffset: function() { return this._offset; },
  
  setOffset: function(offset) {
    this._offset = offset;
    this.update();
  },
  
  _scale: 0,
  
  getScale: function() { return this._scale; },
  
  setScale: function(scale) {
    this._scale = Math.min(Math.max(scale, this.getMinimumScale()), this.getMaximumScale());
    this.update();
  },
  
  _rotation: 0,
  
  getRotation: function() { return this._rotation; },
  
  setRotation: function(rotation) {
    var rotation = this._rotation = rotation;
    this.update();
  },
  
  _minimumScale: 0.5,
  
  getMinimumScale: function() { return this._minimumScale; },
  
  setMinimumScale: function(minimumScale) { this._minimumScale = minimumScale; },
  
  _maximumScale: 5,
  
  getMaximumScale: function() { return this._maximumScale; },
  
  setMaximumScale: function(maximumScale) { this._maximumScale = maximumScale; },
};


$(function() { $('.sq-element').each(function(index, element) { new Squeegee(element); }); });
