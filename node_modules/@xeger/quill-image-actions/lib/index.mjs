function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  Object.defineProperty(subClass, "prototype", {
    writable: false
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };
  return _setPrototypeOf(o, p);
}

function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;

  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

function _possibleConstructorReturn(self, call) {
  if (call && (typeof call === "object" || typeof call === "function")) {
    return call;
  } else if (call !== void 0) {
    throw new TypeError("Derived constructors may only return object or undefined");
  }

  return _assertThisInitialized(self);
}

function _createSuper(Derived) {
  var hasNativeReflectConstruct = _isNativeReflectConstruct();

  return function _createSuperInternal() {
    var Super = _getPrototypeOf(Derived),
        result;

    if (hasNativeReflectConstruct) {
      var NewTarget = _getPrototypeOf(this).constructor;

      result = Reflect.construct(Super, arguments, NewTarget);
    } else {
      result = Super.apply(this, arguments);
    }

    return _possibleConstructorReturn(this, result);
  };
}

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArrayLimit(arr, i) {
  var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

  if (_i == null) return;
  var _arr = [];
  var _n = true;
  var _d = false;

  var _s, _e;

  try {
    for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

  return arr2;
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

var Action = /*#__PURE__*/function () {
  function Action(formatter) {
    _classCallCheck(this, Action);

    _defineProperty(this, "formatter", void 0);

    this.formatter = formatter;
  }

  _createClass(Action, [{
    key: "onCreate",
    value: function onCreate() {
      return;
    }
  }, {
    key: "onDestroy",
    value: function onDestroy() {
      return;
    }
  }, {
    key: "onUpdate",
    value: function onUpdate() {
      return;
    }
  }]);

  return Action;
}();

_defineProperty(Action, "formats", []);

var LEFT_ALIGN = 'left';
var CENTER_ALIGN = 'center';
var RIGHT_ALIGN = 'right';

var DefaultAligner = /*#__PURE__*/function () {
  function DefaultAligner(quill, options) {
    var _this = this,
        _this$alignments;

    _classCallCheck(this, DefaultAligner);

    _defineProperty(this, "alignments", void 0);

    _defineProperty(this, "alignAttribute", void 0);

    _defineProperty(this, "applyStyle", void 0);

    _defineProperty(this, "quill", void 0);

    this.quill = quill;
    this.applyStyle = options.aligner.applyStyle;
    this.alignAttribute = options.attribute;
    this.alignments = (_this$alignments = {}, _defineProperty(_this$alignments, LEFT_ALIGN, {
      name: LEFT_ALIGN,
      icon: options.icons.left,
      apply: function apply(el) {
        var ctx = _this.getContext(el);

        if (!ctx) return;

        _this.quill.formatLine(ctx.index, 1, 'align', false, 'user');

        _this.quill.formatText(ctx.index, 1, 'float', 'left', 'user');

        if (ctx.precedesNewline) {
          _this.quill.deleteText(ctx.index + 1, 1, 'user');
        }
      }
    }), _defineProperty(_this$alignments, CENTER_ALIGN, {
      name: CENTER_ALIGN,
      icon: options.icons.center,
      apply: function apply(el) {
        var ctx = _this.getContext(el);

        if (!ctx) return;
        if (!ctx.precedesNewline) _this.quill.insertText(ctx.index + 1, '\n', 'user');

        _this.quill.formatLine(ctx.index, 1, 'align', 'center', 'user');

        _this.quill.formatText(ctx.index, 1, 'float', false, 'user');
      }
    }), _defineProperty(_this$alignments, RIGHT_ALIGN, {
      name: RIGHT_ALIGN,
      icon: options.icons.right,
      apply: function apply(el) {
        var ctx = _this.getContext(el);

        if (!ctx) return;

        _this.quill.formatLine(ctx.index, 1, 'align', false, 'user');

        _this.quill.formatText(ctx.index, 1, 'float', 'right', 'user');

        if (ctx.precedesNewline) {
          _this.quill.deleteText(ctx.index + 1, 1, 'user');
        }
      }
    }), _this$alignments);
  }

  _createClass(DefaultAligner, [{
    key: "getContext",
    value: function getContext(el) {
      var _next$ops$;

      var blot = this.quill.constructor.find(el);
      if (!blot) return null;
      var index = this.quill.getIndex(blot);
      if (typeof index !== 'number') return null;
      var next = this.quill.getContents(index + 1, 1);
      return {
        blot: blot,
        index: index,
        precedesNewline: next && next.ops && typeof ((_next$ops$ = next.ops[0]) === null || _next$ops$ === void 0 ? void 0 : _next$ops$.insert) === 'string' && next.ops[0].insert.startsWith('\n')
      };
    }
  }, {
    key: "getAlignments",
    value: function getAlignments() {
      var _this2 = this;

      return Object.keys(this.alignments).map(function (k) {
        return _this2.alignments[k];
      });
    }
  }, {
    key: "clear",
    value: function clear(el) {
      var ctx = this.getContext(el);
      if (!ctx) return;
      this.quill.formatLine(ctx.index, 1, 'align', false, 'user');
      this.quill.formatText(ctx.index, 1, 'float', false, 'user');
      if (ctx.precedesNewline) this.quill.deleteText(ctx.index + 1, 1, 'user');
    }
  }, {
    key: "isAligned",
    value: function isAligned(el, alignment) {
      var ctx = this.getContext(el);
      if (!ctx) return false;
      var contents = this.quill.getContents(ctx.index);
      var after = this.quill.getContents(ctx.index + 1);
      if (!contents.ops || !after.ops) return false;

      var _contents$ops = _slicedToArray(contents.ops, 1),
          _contents$ops$ = _contents$ops[0],
          attributes = _contents$ops$.attributes,
          image = _contents$ops$.insert.image;

      var _after$ops = _slicedToArray(after.ops, 1),
          afterAttributes = _after$ops[0].attributes;

      if (!image) return false;

      switch (alignment.name) {
        case LEFT_ALIGN:
        case RIGHT_ALIGN:
          return (attributes === null || attributes === void 0 ? void 0 : attributes["float"]) === alignment.name;

        case CENTER_ALIGN:
          return (afterAttributes === null || afterAttributes === void 0 ? void 0 : afterAttributes.align) === 'center';

        default:
          return false;
      }
    }
  }]);

  return DefaultAligner;
}();

var DefaultToolbar = /*#__PURE__*/function () {
  function DefaultToolbar() {
    _classCallCheck(this, DefaultToolbar);

    _defineProperty(this, "toolbar", void 0);

    _defineProperty(this, "buttons", void 0);

    this.toolbar = null;
    this.buttons = [];
  }

  _createClass(DefaultToolbar, [{
    key: "create",
    value: function create(formatter, aligner) {
      var toolbar = document.createElement('div');
      toolbar.classList.add(formatter.options.align.toolbar.mainClassName);
      this.addToolbarStyle(formatter, toolbar);
      this.addButtons(formatter, toolbar, aligner);
      this.toolbar = toolbar;
      return this.toolbar;
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.toolbar = null;
      this.buttons = [];
    }
  }, {
    key: "getElement",
    value: function getElement() {
      return this.toolbar;
    }
  }, {
    key: "addToolbarStyle",
    value: function addToolbarStyle(formatter, toolbar) {
      if (formatter.options.align.toolbar.mainStyle) {
        Object.assign(toolbar.style, formatter.options.align.toolbar.mainStyle);
      }
    }
  }, {
    key: "addButtonStyle",
    value: function addButtonStyle(button, index, formatter) {
      if (formatter.options.align.toolbar.buttonStyle) {
        Object.assign(button.style, formatter.options.align.toolbar.buttonStyle);

        if (index > 0) {
          button.style.borderLeftWidth = '0'; // eslint-disable-line no-param-reassign
        }
      }

      if (formatter.options.align.toolbar.svgStyle) {
        Object.assign(button.children[0].style, formatter.options.align.toolbar.svgStyle);
      }
    }
  }, {
    key: "addButtons",
    value: function addButtons(formatter, toolbar, aligner) {
      var _this = this;

      aligner.getAlignments().forEach(function (alignment, i) {
        var button = document.createElement('span');
        button.classList.add(formatter.options.align.toolbar.buttonClassName);
        button.innerHTML = alignment.icon;
        button.addEventListener('click', function () {
          _this.onButtonClick(button, formatter, alignment, aligner);
        });

        _this.preselectButton(button, alignment, formatter, aligner);

        _this.addButtonStyle(button, i, formatter);

        _this.buttons.push(button);

        toolbar.appendChild(button);
      });
    }
  }, {
    key: "preselectButton",
    value: function preselectButton(button, alignment, formatter, aligner) {
      if (!formatter.currentSpec) {
        return;
      }

      var target = formatter.currentSpec.getTargetElement();

      if (!target) {
        return;
      }

      if (aligner.isAligned(target, alignment)) {
        this.selectButton(formatter, button);
      }
    }
  }, {
    key: "onButtonClick",
    value: function onButtonClick(button, formatter, alignment, aligner) {
      if (!formatter.currentSpec) {
        return;
      }

      var target = formatter.currentSpec.getTargetElement();

      if (!target) {
        return;
      }

      this.clickButton(button, target, formatter, alignment, aligner);
    }
  }, {
    key: "clickButton",
    value: function clickButton(button, alignTarget, formatter, alignment, aligner) {
      var _this2 = this;

      this.buttons.forEach(function (b) {
        _this2.deselectButton(formatter, b);
      });

      if (aligner.isAligned(alignTarget, alignment)) {
        if (formatter.options.align.toolbar.allowDeselect) {
          aligner.clear(alignTarget);
        } else {
          this.selectButton(formatter, button);
        }
      } else {
        this.selectButton(formatter, button);
        alignment.apply(alignTarget);
      }

      formatter.update();
    }
  }, {
    key: "selectButton",
    value: function selectButton(formatter, button) {
      button.classList.add('is-selected');

      if (formatter.options.align.toolbar.addButtonSelectStyle) {
        button.style.setProperty('filter', 'invert(20%)');
      }
    }
  }, {
    key: "deselectButton",
    value: function deselectButton(formatter, button) {
      button.classList.remove('is-selected');

      if (formatter.options.align.toolbar.addButtonSelectStyle) {
        button.style.removeProperty('filter');
      }
    }
  }]);

  return DefaultToolbar;
}();

var AlignAction = /*#__PURE__*/function (_Action) {
  _inherits(AlignAction, _Action);

  var _super = _createSuper(AlignAction);

  function AlignAction(formatter) {
    var _this;

    _classCallCheck(this, AlignAction);

    _this = _super.call(this, formatter);

    _defineProperty(_assertThisInitialized(_this), "toolbar", void 0);

    _defineProperty(_assertThisInitialized(_this), "aligner", void 0);

    _this.aligner = new DefaultAligner(formatter.quill, formatter.options.align);
    _this.toolbar = new DefaultToolbar();
    return _this;
  }

  _createClass(AlignAction, [{
    key: "onCreate",
    value: function onCreate() {
      var toolbar = this.toolbar.create(this.formatter, this.aligner);
      this.formatter.overlay.appendChild(toolbar);
    }
  }, {
    key: "onDestroy",
    value: function onDestroy() {
      var toolbar = this.toolbar.getElement();

      if (!toolbar) {
        return;
      }

      this.formatter.overlay.removeChild(toolbar);
      this.toolbar.destroy();
    }
  }]);

  return AlignAction;
}(Action);

_defineProperty(AlignAction, "formats", ['float']);

var ResizeAction = /*#__PURE__*/function (_Action) {
  _inherits(ResizeAction, _Action);

  var _super = _createSuper(ResizeAction);

  function ResizeAction(formatter) {
    var _this;

    _classCallCheck(this, ResizeAction);

    _this = _super.call(this, formatter);

    _defineProperty(_assertThisInitialized(_this), "topLeftHandle", void 0);

    _defineProperty(_assertThisInitialized(_this), "topRightHandle", void 0);

    _defineProperty(_assertThisInitialized(_this), "bottomRightHandle", void 0);

    _defineProperty(_assertThisInitialized(_this), "bottomLeftHandle", void 0);

    _defineProperty(_assertThisInitialized(_this), "dragHandle", void 0);

    _defineProperty(_assertThisInitialized(_this), "dragStartX", void 0);

    _defineProperty(_assertThisInitialized(_this), "preDragWidth", void 0);

    _defineProperty(_assertThisInitialized(_this), "targetRatio", void 0);

    _defineProperty(_assertThisInitialized(_this), "onMouseDown", function (event) {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      _this.dragHandle = event.target;

      _this.setCursor(_this.dragHandle.style.cursor);

      if (!_this.formatter.currentSpec) {
        return;
      }

      var target = _this.formatter.currentSpec.getTargetElement();

      if (!target) {
        return;
      }

      var rect = target.getBoundingClientRect();
      _this.dragStartX = event.clientX;
      _this.preDragWidth = rect.width;
      _this.targetRatio = rect.height / rect.width;
      event.preventDefault();
      event.stopPropagation();
      document.addEventListener('mousemove', _this.onDrag);
      document.addEventListener('mouseup', _this.onMouseUp);
    });

    _defineProperty(_assertThisInitialized(_this), "onDrag", function (event) {
      if (!_this.formatter.currentSpec) {
        return;
      }

      var target = _this.formatter.currentSpec.getTargetElement();

      if (!target) {
        return;
      }

      var deltaX = event.clientX - _this.dragStartX;
      var newWidth = 0;

      if (_this.dragHandle === _this.topLeftHandle || _this.dragHandle === _this.bottomLeftHandle) {
        newWidth = Math.round(_this.preDragWidth - deltaX);
      } else {
        newWidth = Math.round(_this.preDragWidth + deltaX);
      }

      var newHeight = _this.targetRatio * newWidth;
      target.style.removeProperty('width');
      target.style.removeProperty('height');
      target.setAttribute('width', "".concat(newWidth));
      target.setAttribute('height', "".concat(newHeight));

      _this.formatter.update();
    });

    _defineProperty(_assertThisInitialized(_this), "onMouseUp", function () {
      _this.setCursor('');

      document.removeEventListener('mousemove', _this.onDrag);
      document.removeEventListener('mouseup', _this.onMouseUp);
    });

    _this.topLeftHandle = _this.createHandle('top-left', 'nwse-resize');
    _this.topRightHandle = _this.createHandle('top-right', 'nesw-resize');
    _this.bottomRightHandle = _this.createHandle('bottom-right', 'nwse-resize');
    _this.bottomLeftHandle = _this.createHandle('bottom-left', 'nesw-resize');
    _this.dragHandle = null;
    _this.dragStartX = 0;
    _this.preDragWidth = 0;
    _this.targetRatio = 0;
    return _this;
  }

  _createClass(ResizeAction, [{
    key: "onCreate",
    value: function onCreate() {
      this.formatter.overlay.appendChild(this.topLeftHandle);
      this.formatter.overlay.appendChild(this.topRightHandle);
      this.formatter.overlay.appendChild(this.bottomRightHandle);
      this.formatter.overlay.appendChild(this.bottomLeftHandle);
      this.repositionHandles(this.formatter.options.resize.handleStyle);
    }
  }, {
    key: "onDestroy",
    value: function onDestroy() {
      this.setCursor('');
      this.formatter.overlay.removeChild(this.topLeftHandle);
      this.formatter.overlay.removeChild(this.topRightHandle);
      this.formatter.overlay.removeChild(this.bottomRightHandle);
      this.formatter.overlay.removeChild(this.bottomLeftHandle);
    }
  }, {
    key: "createHandle",
    value: function createHandle(position, cursor) {
      var box = document.createElement('div');
      box.classList.add(this.formatter.options.resize.handleClassName);
      box.setAttribute('data-position', position);
      box.style.cursor = cursor;

      if (this.formatter.options.resize.handleStyle) {
        Object.assign(box.style, this.formatter.options.resize.handleStyle);
      }

      box.addEventListener('mousedown', this.onMouseDown);
      return box;
    }
  }, {
    key: "repositionHandles",
    value: function repositionHandles(handleStyle) {
      var handleXOffset = '0px';
      var handleYOffset = '0px';

      if (handleStyle) {
        if (handleStyle.width) {
          handleXOffset = "".concat(-parseFloat(handleStyle.width) / 2, "px");
        }

        if (handleStyle.height) {
          handleYOffset = "".concat(-parseFloat(handleStyle.height) / 2, "px");
        }
      }

      Object.assign(this.topLeftHandle.style, {
        left: handleXOffset,
        top: handleYOffset
      });
      Object.assign(this.topRightHandle.style, {
        right: handleXOffset,
        top: handleYOffset
      });
      Object.assign(this.bottomRightHandle.style, {
        right: handleXOffset,
        bottom: handleYOffset
      });
      Object.assign(this.bottomLeftHandle.style, {
        left: handleXOffset,
        bottom: handleYOffset
      });
    }
  }, {
    key: "setCursor",
    value: function setCursor(value) {
      if (document.body) {
        document.body.style.cursor = value;
      }

      if (this.formatter.currentSpec) {
        var target = this.formatter.currentSpec.getOverlayElement();

        if (target) {
          target.style.cursor = value;
        }
      }
    }
  }]);

  return ResizeAction;
}(Action);

_defineProperty(ResizeAction, "formats", ['height', 'width']);

var DeleteAction = /*#__PURE__*/function (_Action) {
  _inherits(DeleteAction, _Action);

  var _super = _createSuper(DeleteAction);

  function DeleteAction() {
    var _this;

    _classCallCheck(this, DeleteAction);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _super.call.apply(_super, [this].concat(args));

    _defineProperty(_assertThisInitialized(_this), "onKeyUp", function (e) {
      if (!_this.formatter.currentSpec) {
        return;
      } // delete or backspace


      if (e.keyCode === 46 || e.keyCode === 8) {
        var node = _this.formatter.currentSpec.getTargetElement();

        if (node) {
          var blot = _this.formatter.quill.constructor.find(node);

          if (blot) {
            blot.deleteAt(0);
          }
        }

        _this.formatter.hide();
      }
    });

    return _this;
  }

  _createClass(DeleteAction, [{
    key: "onCreate",
    value: function onCreate() {
      document.addEventListener('keyup', this.onKeyUp, true); // @ts-expect-error 2769 imprecise Quill typing

      this.formatter.quill.root.addEventListener('input', this.onKeyUp, true);
    }
  }, {
    key: "onDestroy",
    value: function onDestroy() {
      document.removeEventListener('keyup', this.onKeyUp); // @ts-expect-error 2769 imprecise Quill typing

      this.formatter.quill.root.removeEventListener('input', this.onKeyUp);
    }
  }]);

  return DeleteAction;
}(Action);

var BlotSpec = /*#__PURE__*/function () {
  function BlotSpec(formatter) {
    _classCallCheck(this, BlotSpec);

    _defineProperty(this, "formatter", void 0);

    this.formatter = formatter;
  }

  _createClass(BlotSpec, [{
    key: "init",
    value: function init() {
      return;
    }
  }, {
    key: "getActions",
    value: function getActions() {
      return [AlignAction, ResizeAction, DeleteAction];
    }
  }, {
    key: "getTargetElement",
    value: function getTargetElement() {
      return null;
    }
  }, {
    key: "getOverlayElement",
    value: function getOverlayElement() {
      return this.getTargetElement();
    }
  }, {
    key: "setSelection",
    value: function setSelection() {
      this.formatter.quill.setSelection(null);
    }
  }, {
    key: "onHide",
    value: function onHide() {
      return;
    }
  }]);

  return BlotSpec;
}();

var ImageSpec = /*#__PURE__*/function (_BlotSpec) {
  _inherits(ImageSpec, _BlotSpec);

  var _super = _createSuper(ImageSpec);

  function ImageSpec(formatter) {
    var _this;

    _classCallCheck(this, ImageSpec);

    _this = _super.call(this, formatter);

    _defineProperty(_assertThisInitialized(_this), "img", void 0);

    _defineProperty(_assertThisInitialized(_this), "onClick", function (event) {
      var el = event.target;

      if (!(el instanceof HTMLElement) || el.tagName !== 'IMG') {
        return;
      }

      _this.img = el;

      _this.formatter.show(_assertThisInitialized(_this));
    });

    _this.img = null;
    return _this;
  }

  _createClass(ImageSpec, [{
    key: "init",
    value: function init() {
      this.formatter.quill.root.addEventListener('click', this.onClick);
    }
  }, {
    key: "getTargetElement",
    value: function getTargetElement() {
      return this.img;
    }
  }, {
    key: "onHide",
    value: function onHide() {
      this.img = null;
    }
  }]);

  return ImageSpec;
}(BlotSpec);

var MOUSE_ENTER_ATTRIBUTE = 'data-image-actions-unclickable-bound';
var PROXY_IMAGE_CLASS = 'image-actions__proxy-image';

var UnclickableBlotSpec = /*#__PURE__*/function (_BlotSpec) {
  _inherits(UnclickableBlotSpec, _BlotSpec);

  var _super = _createSuper(UnclickableBlotSpec);

  function UnclickableBlotSpec(formatter, selector) {
    var _this;

    _classCallCheck(this, UnclickableBlotSpec);

    _this = _super.call(this, formatter);

    _defineProperty(_assertThisInitialized(_this), "selector", void 0);

    _defineProperty(_assertThisInitialized(_this), "unclickable", void 0);

    _defineProperty(_assertThisInitialized(_this), "nextUnclickable", void 0);

    _defineProperty(_assertThisInitialized(_this), "proxyImage", void 0);

    _defineProperty(_assertThisInitialized(_this), "onTextChange", function () {
      Array.from(document.querySelectorAll("".concat(_this.selector, ":not([").concat(MOUSE_ENTER_ATTRIBUTE, "])"))).forEach(function (unclickable) {
        unclickable.setAttribute(MOUSE_ENTER_ATTRIBUTE, 'true'); // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore:2769

        unclickable.addEventListener('mouseenter', _this.onMouseEnter);
      });
    });

    _defineProperty(_assertThisInitialized(_this), "onMouseEnter", function (event) {
      var unclickable = event.target;

      if (!(unclickable instanceof HTMLElement)) {
        return;
      }

      _this.nextUnclickable = unclickable;

      _this.repositionProxyImage(_this.nextUnclickable);
    });

    _defineProperty(_assertThisInitialized(_this), "onProxyImageClick", function () {
      _this.unclickable = _this.nextUnclickable;
      _this.nextUnclickable = null;

      _this.formatter.show(_assertThisInitialized(_this));

      _this.hideProxyImage();
    });

    _this.selector = selector;
    _this.unclickable = null;
    _this.nextUnclickable = null;
    return _this;
  }

  _createClass(UnclickableBlotSpec, [{
    key: "init",
    value: function init() {
      var _this$proxyImage;

      if (document.body) {
        /*
        it's important that this is attached to the body instead of the root quill element.
        this prevents the click event from overlapping with ImageSpec
         */
        document.body.appendChild(this.createProxyImage());
      }

      this.hideProxyImage();
      (_this$proxyImage = this.proxyImage) === null || _this$proxyImage === void 0 ? void 0 : _this$proxyImage.addEventListener('click', this.onProxyImageClick);
      this.formatter.quill.on('text-change', this.onTextChange);
    }
  }, {
    key: "getTargetElement",
    value: function getTargetElement() {
      return this.unclickable;
    }
  }, {
    key: "getOverlayElement",
    value: function getOverlayElement() {
      return this.unclickable;
    }
  }, {
    key: "onHide",
    value: function onHide() {
      this.hideProxyImage();
      this.nextUnclickable = null;
      this.unclickable = null;
    }
  }, {
    key: "createProxyImage",
    value: function createProxyImage() {
      var canvas = document.createElement('canvas');

      try {
        var context = canvas.getContext('2d');
        if (!context) return canvas;
        context.globalAlpha = 0;
        context.fillRect(0, 0, 1, 1);
        this.proxyImage = document.createElement('img');
        this.proxyImage.src = canvas.toDataURL('image/png');
        this.proxyImage.classList.add(PROXY_IMAGE_CLASS);
        Object.assign(this.proxyImage.style, {
          position: 'absolute',
          margin: '0'
        });
        return this.proxyImage;
      } catch (err) {
        // when using js-dom:
        // Error: Not implemented: ... (without installing the canvas npm package)
        return canvas;
      }
    }
  }, {
    key: "hideProxyImage",
    value: function hideProxyImage() {
      if (this.proxyImage) Object.assign(this.proxyImage.style, {
        display: 'none'
      });
    }
  }, {
    key: "repositionProxyImage",
    value: function repositionProxyImage(unclickable) {
      var rect = unclickable.getBoundingClientRect();
      if (this.proxyImage) Object.assign(this.proxyImage.style, {
        display: 'block',
        left: "".concat(rect.left + window.pageXOffset, "px"),
        top: "".concat(rect.top + window.pageYOffset, "px"),
        width: "".concat(rect.width, "px"),
        height: "".concat(rect.height, "px")
      });
    }
  }]);

  return UnclickableBlotSpec;
}(BlotSpec);

var IframeVideoSpec = /*#__PURE__*/function (_UnclickableBlotSpec) {
  _inherits(IframeVideoSpec, _UnclickableBlotSpec);

  var _super = _createSuper(IframeVideoSpec);

  function IframeVideoSpec(formatter) {
    _classCallCheck(this, IframeVideoSpec);

    return _super.call(this, formatter, 'iframe.ql-video');
  }

  return _createClass(IframeVideoSpec);
}(UnclickableBlotSpec);

var DefaultOptions = {
  specs: [ImageSpec, IframeVideoSpec],
  overlay: {
    className: 'image-actions__overlay',
    style: {
      position: 'absolute',
      boxSizing: 'border-box',
      border: '1px dashed #444'
    }
  },
  align: {
    attribute: 'data-align',
    aligner: {
      applyStyle: true
    },
    icons: {
      // <svg viewbox="0 0 18 18">
      // <line class="ql-stroke" x1="3" x2="15" y1="9" y2="9"></line>
      // <line class="ql-stroke" x1="3" x2="13" y1="14" y2="14"></line>
      // <line class="ql-stroke" x1="3" x2="9" y1="4" y2="4"></line>
      // </svg>
      left: "\n      <svg viewBox=\"0 0 24 24\"><path d=\"M3 7h6v6H3V7m0-4h18v2H3V3m18 4v2H11V7h10m0 4v2H11v-2h10M3 15h14v2H3v-2m0 4h18v2H3v-2z\"/></svg>\n      ",
      //   <svg viewbox="0 0 18 18">
      //   <line class="ql-stroke" x1="15" x2="3" y1="9" y2="9"></line>
      //  <line class="ql-stroke" x1="14" x2="4" y1="14" y2="14"></line>
      //  <line class="ql-stroke" x1="12" x2="6" y1="4" y2="4"></line>
      //  </svg>
      center: "\n      <svg viewBox=\"0 0 24 24\"><path d=\"M9 7h6v6H9V7M3 3h18v2H3V3m0 12h18v2H3v-2m0 4h14v2H3v-2z\"/></svg>\n      ",
      // <svg viewbox="0 0 18 18">
      // <line class="ql-stroke" x1="15" x2="3" y1="9" y2="9"></line>
      // <line class="ql-stroke" x1="15" x2="5" y1="14" y2="14"></line>
      // <line class="ql-stroke" x1="15" x2="9" y1="4" y2="4"></line>
      // </svg>
      right: "\n      <svg viewBox=\"0 0 24 24\"><path d=\"M15 7h6v6h-6V7M3 3h18v2H3V3m10 4v2H3V7h10m-4 4v2H3v-2h6m-6 4h14v2H3v-2m0 4h18v2H3v-2z\"/></svg>\n      "
    },
    toolbar: {
      allowDeselect: true,
      mainClassName: 'image-actions__toolbar',
      mainStyle: {
        position: 'absolute',
        top: '-12px',
        right: '0',
        left: '0',
        height: '0',
        minWidth: '100px',
        font: '12px/1.0 Arial, Helvetica, sans-serif',
        textAlign: 'center',
        color: '#333',
        boxSizing: 'border-box',
        cursor: 'default',
        zIndex: '1'
      },
      buttonClassName: 'image-actions__toolbar-button',
      addButtonSelectStyle: true,
      buttonStyle: {
        display: 'inline-block',
        width: '24px',
        height: '24px',
        background: 'white',
        border: '1px solid #999',
        verticalAlign: 'middle'
      },
      svgStyle: {
        display: 'inline-block',
        width: '24px',
        height: '24px',
        background: 'white',
        border: '1px solid #999',
        verticalAlign: 'middle'
      }
    }
  },
  resize: {
    handleClassName: 'image-actions__resize-handle',
    handleStyle: {
      position: 'absolute',
      height: '12px',
      width: '12px',
      backgroundColor: 'white',
      border: '1px solid #777',
      boxSizing: 'border-box',
      opacity: '0.80'
    }
  }
};

var isMergeableObject = function isMergeableObject(value) {
	return isNonNullObject(value)
		&& !isSpecial(value)
};

function isNonNullObject(value) {
	return !!value && typeof value === 'object'
}

function isSpecial(value) {
	var stringValue = Object.prototype.toString.call(value);

	return stringValue === '[object RegExp]'
		|| stringValue === '[object Date]'
		|| isReactElement(value)
}

// see https://github.com/facebook/react/blob/b5ac963fb791d1298e7f396236383bc955f916c1/src/isomorphic/classic/element/ReactElement.js#L21-L25
var canUseSymbol = typeof Symbol === 'function' && Symbol.for;
var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7;

function isReactElement(value) {
	return value.$$typeof === REACT_ELEMENT_TYPE
}

function emptyTarget(val) {
	return Array.isArray(val) ? [] : {}
}

function cloneUnlessOtherwiseSpecified(value, options) {
	return (options.clone !== false && options.isMergeableObject(value))
		? deepmerge(emptyTarget(value), value, options)
		: value
}

function defaultArrayMerge(target, source, options) {
	return target.concat(source).map(function(element) {
		return cloneUnlessOtherwiseSpecified(element, options)
	})
}

function getMergeFunction(key, options) {
	if (!options.customMerge) {
		return deepmerge
	}
	var customMerge = options.customMerge(key);
	return typeof customMerge === 'function' ? customMerge : deepmerge
}

function getEnumerableOwnPropertySymbols(target) {
	return Object.getOwnPropertySymbols
		? Object.getOwnPropertySymbols(target).filter(function(symbol) {
			return target.propertyIsEnumerable(symbol)
		})
		: []
}

function getKeys(target) {
	return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target))
}

function propertyIsOnObject(object, property) {
	try {
		return property in object
	} catch(_) {
		return false
	}
}

// Protects from prototype poisoning and unexpected merging up the prototype chain.
function propertyIsUnsafe(target, key) {
	return propertyIsOnObject(target, key) // Properties are safe to merge if they don't exist in the target yet,
		&& !(Object.hasOwnProperty.call(target, key) // unsafe if they exist up the prototype chain,
			&& Object.propertyIsEnumerable.call(target, key)) // and also unsafe if they're nonenumerable.
}

function mergeObject(target, source, options) {
	var destination = {};
	if (options.isMergeableObject(target)) {
		getKeys(target).forEach(function(key) {
			destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
		});
	}
	getKeys(source).forEach(function(key) {
		if (propertyIsUnsafe(target, key)) {
			return
		}

		if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
			destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
		} else {
			destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
		}
	});
	return destination
}

function deepmerge(target, source, options) {
	options = options || {};
	options.arrayMerge = options.arrayMerge || defaultArrayMerge;
	options.isMergeableObject = options.isMergeableObject || isMergeableObject;
	// cloneUnlessOtherwiseSpecified is added to `options` so that custom arrayMerge()
	// implementations can use it. The caller may not replace it.
	options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;

	var sourceIsArray = Array.isArray(source);
	var targetIsArray = Array.isArray(target);
	var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;

	if (!sourceAndTargetTypesMatch) {
		return cloneUnlessOtherwiseSpecified(source, options)
	} else if (sourceIsArray) {
		return options.arrayMerge(target, source, options)
	} else {
		return mergeObject(target, source, options)
	}
}

deepmerge.all = function deepmergeAll(array, options) {
	if (!Array.isArray(array)) {
		throw new Error('first argument should be an array')
	}

	return array.reduce(function(prev, next) {
		return deepmerge(prev, next, options)
	}, {})
};

var deepmerge_1 = deepmerge;

var cjs = deepmerge_1;

var dontMerge = function dontMerge(destination, source) {
  return source;
};

var ImageActions = /*#__PURE__*/function () {
  function ImageActions(quill) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, ImageActions);

    _defineProperty(this, "quill", void 0);

    _defineProperty(this, "Quill", void 0);

    _defineProperty(this, "options", void 0);

    _defineProperty(this, "currentSpec", void 0);

    _defineProperty(this, "specs", void 0);

    _defineProperty(this, "overlay", void 0);

    _defineProperty(this, "actions", void 0);

    this.quill = quill;
    this.Quill = quill.constructor;
    this.options = cjs(DefaultOptions, options, {
      arrayMerge: dontMerge
    });
    this.currentSpec = null;
    this.actions = [];
    this.overlay = document.createElement('div');
    this.overlay.classList.add(this.options.overlay.className);

    if (this.options.overlay.style) {
      Object.assign(this.overlay.style, this.options.overlay.style);
    } // todo: still necessary? may be a relic of Firefox support


    this.withParentNode(function (pn) {
      pn.style.position = pn.style.position || 'relative';
    });
    this.quill.root.addEventListener('click', function () {
      return _this.hide();
    });
    this.quill.root.addEventListener('scroll', function () {
      return _this.update();
    });
    this.specs = this.options.specs.map(function (Class) {
      return new Class(_this);
    });
    this.specs.forEach(function (spec) {
      return spec.init();
    });
  }

  _createClass(ImageActions, [{
    key: "withParentNode",
    value: function withParentNode(callback) {
      if (this.quill.root.parentNode) {
        callback(this.quill.root.parentNode);
      }
    }
  }, {
    key: "show",
    value: function show(spec) {
      var _this2 = this;

      this.currentSpec = spec;
      this.currentSpec.setSelection();
      this.setUserSelect('none');
      this.withParentNode(function (pn) {
        return pn.appendChild(_this2.overlay);
      });
      this.repositionOverlay();
      this.createActions(spec);
    }
  }, {
    key: "hide",
    value: function hide() {
      var _this3 = this;

      if (!this.currentSpec) {
        return;
      }

      this.currentSpec.onHide();
      this.currentSpec = null;
      this.withParentNode(function (pn) {
        return pn === null || pn === void 0 ? void 0 : pn.removeChild(_this3.overlay);
      });
      this.overlay.style.setProperty('display', 'none');
      this.setUserSelect('');
      this.destroyActions();
    }
  }, {
    key: "update",
    value: function update() {
      this.repositionOverlay();
      this.actions.forEach(function (action) {
        return action.onUpdate();
      });
    }
  }, {
    key: "createActions",
    value: function createActions(spec) {
      var _this4 = this;

      var actions = spec.getActions().filter(function (ActionClass) {
        return !ActionClass.formats.length || ActionClass.formats.some(function (f) {
          return (// @ts-expect-error 2339 seems to work; apparently not part of public API
            _this4.quill.options.formats.includes(f)
          );
        });
      });
      this.actions = actions.map(function (ActionClass) {
        var action = new ActionClass(_this4);
        action.onCreate();
        return action;
      });
    }
  }, {
    key: "destroyActions",
    value: function destroyActions() {
      this.actions.forEach(function (action) {
        return action.onDestroy();
      });
      this.actions = [];
    }
  }, {
    key: "repositionOverlay",
    value: function repositionOverlay() {
      var _this5 = this;

      if (!this.currentSpec) {
        return;
      }

      var overlayTarget = this.currentSpec.getOverlayElement();

      if (!overlayTarget) {
        return;
      }

      this.withParentNode(function (pn) {
        var specRect = overlayTarget.getBoundingClientRect();
        var parentRect = pn.getBoundingClientRect();
        Object.assign(_this5.overlay.style, {
          display: 'block',
          left: "".concat(specRect.left - parentRect.left - 1 + pn.scrollLeft, "px"),
          top: "".concat(specRect.top - parentRect.top + pn.scrollTop, "px"),
          width: "".concat(specRect.width, "px"),
          height: "".concat(specRect.height, "px")
        });
      });
    }
  }, {
    key: "setUserSelect",
    value: function setUserSelect(value) {
      var _this6 = this;

      var props = ['userSelect', 'mozUserSelect', 'webkitUserSelect', 'msUserSelect'];
      props.forEach(function (prop) {
        // set on contenteditable element and <html>
        _this6.quill.root.style.setProperty(prop, value);

        if (document.documentElement) {
          document.documentElement.style.setProperty(prop, value);
        }
      });
    }
  }]);

  return ImageActions;
}();

_defineProperty(ImageActions, "DefaultOptions", DefaultOptions);

export { Action, AlignAction, BlotSpec, DefaultAligner, DefaultOptions, DefaultToolbar, DeleteAction, IframeVideoSpec, ImageActions, ImageSpec, ResizeAction, UnclickableBlotSpec };
