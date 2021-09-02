$(function () {
  var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
  function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
  var fillColor = 'rgba(204, 204, 204, 0.3)';
  var circleColor = randomColor(0.3);
  var lineColor = randomColor(0.2);
  function randomColor(opacity) {
    opacity = opacity || 0.3;
    var r =  Math.floor(Math.random() * 255);
    var g =  Math.floor(Math.random() * 255);
    var b =  Math.floor(Math.random() * 255);
    return "rgba(" + r + ',' + g + ',' + b + ',' + opacity + ')';
  }
  var Circle = function () {
    function Circle(x, y) {
      _classCallCheck(this, Circle);
      this.x = x;
      this.y = y;
      this.r = Math.random() * 10;
      this._mx = Math.random();
      this._my = Math.random();
    }
    _createClass(Circle, [{
      key: 'drawCircle',
      value: function drawCircle(ctx) {
        ctx.beginPath();
        //arc() 方法使用一个中心点和半径，为一个画布的当前子路径添加一条弧。
        ctx.arc(this.x, this.y, this.r, 0, 360);
        ctx.closePath();
        ctx.fillStyle = circleColor;
        ctx.fill();
      }
    }, {
      key: 'drawLine',
      value: function drawLine(ctx, _circle) {
        var dx = this.x - _circle.x;
        var dy = this.y - _circle.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 90) {
          ctx.beginPath();
          ctx.moveTo(this.x, this.y); //起始点
          ctx.lineTo(_circle.x, _circle.y); //终点
          ctx.closePath();
          ctx.strokeStyle = lineColor;
          ctx.stroke();
        }
      }
    }, {
      key: 'move',
      value: function move(w, h) {
        this._mx = this.x < w && this.x > 0 ? this._mx : -this._mx;
        this._my = this.y < h && this.y > 0 ? this._my : -this._my;
        this.x += this._mx / 2;
        this.y += this._my / 2;
      }
    }]);
    return Circle;
  }();
  var currentCirle = function (_Circle) {
    _inherits(currentCirle, _Circle);
    function currentCirle(x, y) {
      _classCallCheck(this, currentCirle);
      return _possibleConstructorReturn(this, (currentCirle.__proto__ || Object.getPrototypeOf(currentCirle)).call(this, x, y));
    }
    _createClass(currentCirle, [{
      key: 'drawCircle',
      value: function drawCircle(ctx) {
        ctx.beginPath();
        //this.r = (this.r < 14 && this.r > 1) ? this.r + (Math.random() * 2 - 1) : 2;
        this.r = 8;
        ctx.arc(this.x, this.y, this.r, 0, 360);
        ctx.closePath();
        //ctx.fillStyle = 'rgba(0,0,0,' + (parseInt(Math.random() * 100) / 100) + ')'
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
    }]);
    return currentCirle;
  }(Circle);
  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var w = canvas.width = canvas.offsetWidth;
  var h = canvas.height = canvas.offsetHeight;
  var circles = [];
  var current_circle = new currentCirle(0, 0);
  var draw = function draw() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < circles.length; i++) {
      circles[i].move(w, h);
      circles[i].drawCircle(ctx);
      for (j = i + 1; j < circles.length; j++) {
        circles[i].drawLine(ctx, circles[j]);
      }
    }
    if (current_circle.x) {
      current_circle.drawCircle(ctx);
      for (var k = 1; k < circles.length; k++) {
        current_circle.drawLine(ctx, circles[k]);
      }
    }
    requestAnimationFrame(draw);
  };
  var init = function init(num) {
    for (var i = 0; i < num; i++) {
      circles.push(new Circle(Math.random() * w, Math.random() * h));
    }
    draw();
  };
  var initVal = 20;
  if (w + h > 600) {
    var off = w + h - 600;
    initVal += Math.round(off/24);
  }
  window.addEventListener('load', init(initVal));
  window.onmousemove = function (e) {
    e = e || window.event;
    current_circle.x = e.clientX;
    current_circle.y = e.clientY;
  };
  window.onmouseout = function () {
    current_circle.x = null;
    current_circle.y = null;
  };
})