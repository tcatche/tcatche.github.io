/**
 * Insight search plugin
 * @author PPOffice { @link https://github.com/ppoffice }
 */
(function($, CONFIG) {
  var $main = $(".ins-search");
  var $input = $main.find(".ins-search-input");
  var $wrapper = $main.find(".ins-section-wrapper");
  var $container = $main.find(".ins-section-container");
  var $bookmark = $main.find(".ins-bookmark-container");
  $main.parent().remove(".ins-search");
  $("body").append($main);

  function section(title) {
    return $("<section>")
      .addClass("ins-section")
      .append(
        $("<header>")
          .addClass("ins-section-header")
          .text(title)
      );
  }

  function searchItem(icon, title, slug, preview, url, count) {
    return $("<div>")
      .addClass("ins-selectable")
      .addClass("ins-search-item")
      .addClass("ins-type-" + icon)
      .append(
        $("<header>")
          .append(
            icon !=='tag' && $("<i>")
              .addClass("fa")
              .addClass("fa-" + icon)
          )
          .append(
            title != null && title != ""
              ? title
              : CONFIG.TRANSLATION["UNTITLED"]
          )
          .append(
            count > 0 ? '<span class="ins-item-count">(' + count + ')</span>' : ''
          )
      )
      .append(
        preview
          ? $("<p>")
              .addClass("ins-search-preview")
              .text(preview)
          : null
      )
      .attr("data-url", url);
  }

  function sectionFactory(type, array) {
    var sectionTitle;
    var $searchItems;
    if (array.length === 0) return null;
    sectionTitle = CONFIG.TRANSLATION[type];
    switch (type) {
      case "POSTS":
      case "PAGES":
        $searchItems = array.map(function(item) {
          // Use config.root instead of permalink to fix url issue
          return searchItem(
            "file",
            item.title,
            null,
            item.text.slice(0, 150),
            CONFIG.ROOT_URL + item.path
          );
        });
        break;
      case "CATEGORIES":
        $searchItems = array.map(function(item) {
          return searchItem(
            "folder",
            item.name,
            item.slug,
            null,
            item.permalink,
            item.count
          );
        });
        break;
      case "TAGS":
        $searchItems = array.map(function(item) {
          return searchItem(
            "tag",
            item.name,
            item.slug,
            null,
            item.permalink,
            item.count
          );
        });
        break;
      default:
        return null;
    }
    return section(sectionTitle).append($searchItems);
  }

  function extractToSet(json, key) {
    var values = {};
    var entries = json.pages.concat(json.posts);
    entries.forEach(function(entry) {
      if (entry[key]) {
        entry[key].forEach(function(value) {
          if (!values[value.name]) {
            values[value.name] = value;
            values[value.name].count = 0;
          }
          values[value.name].count += 1;
        });
      }
    });
    var result = [];
    for (var key in values) {
      result.push(values[key]);
    }
    return result;
  }

  function parseKeywords(keywords) {
    return keywords
      .split(" ")
      .filter(function(keyword) {
        return !!keyword;
      })
      .map(function(keyword) {
        return keyword.toUpperCase();
      });
  }

  /**
   * Judge if a given post/page/category/tag contains all of the keywords.
   * @param Object            obj     Object to be weighted
   * @param Array<String>     fields  Object's fields to find matches
   */
  function filter(keywords, obj, fields) {
    var result = false;
    var keywordArray = parseKeywords(keywords);
    var containKeywords = keywordArray.filter(function(keyword) {
      var containFields = fields.filter(function(field) {
        if (!obj.hasOwnProperty(field)) return false;
        if (obj[field].toUpperCase().indexOf(keyword) > -1) return true;
      });
      if (containFields.length > 0) return true;
      return false;
    });
    return containKeywords.length === keywordArray.length;
  }

  function filterFactory(keywords) {
    return {
      POST: function(obj) {
        return filter(keywords, obj, ["title", "text"]);
      },
      PAGE: function(obj) {
        return filter(keywords, obj, ["title", "text"]);
      },
      CATEGORY: function(obj) {
        return filter(keywords, obj, ["name", "slug"]);
      },
      TAG: function(obj) {
        return filter(keywords, obj, ["name", "slug"]);
      }
    };
  }

  /**
   * Calculate the weight of a matched post/page/category/tag.
   * @param Object            obj     Object to be weighted
   * @param Array<String>     fields  Object's fields to find matches
   * @param Array<Integer>    weights Weight of every field
   */
  function weight(keywords, obj, fields, weights) {
    var value = 0;
    parseKeywords(keywords).forEach(function(keyword) {
      var pattern = new RegExp(keyword, "img"); // Global, Multi-line, Case-insensitive
      fields.forEach(function(field, index) {
        if (obj.hasOwnProperty(field)) {
          var matches = obj[field].match(pattern);
          value += matches ? matches.length * weights[index] : 0;
        }
      });
    });
    return value;
  }

  function weightFactory(keywords) {
    return {
      POST: function(obj) {
        return weight(keywords, obj, ["title", "text"], [3, 1]);
      },
      PAGE: function(obj) {
        return weight(keywords, obj, ["title", "text"], [3, 1]);
      },
      CATEGORY: function(obj) {
        return weight(keywords, obj, ["name", "slug"], [1, 1]);
      },
      TAG: function(obj) {
        return weight(keywords, obj, ["name", "slug"], [1, 1]);
      }
    };
  }

  function search(json, keywords) {
    var WEIGHTS = weightFactory(keywords);
    var FILTERS = filterFactory(keywords);
    var posts = json.posts;
    var pages = json.pages;
    var tags = extractToSet(json, "tags");
    var categories = extractToSet(json, "categories");

    return {
      posts: posts
        .filter(FILTERS.POST)
        .sort(function(a, b) {
          return WEIGHTS.POST(b) - WEIGHTS.POST(a);
        })
        .slice(0, 8),
      pages: pages
        .filter(FILTERS.PAGE)
        .sort(function(a, b) {
          return WEIGHTS.PAGE(b) - WEIGHTS.PAGE(a);
        })
        .slice(0, 5),
      categories: categories
        .filter(FILTERS.CATEGORY)
        .sort(function(a, b) {
          return WEIGHTS.CATEGORY(b) - WEIGHTS.CATEGORY(a);
        })
        .slice(0, 8),
      tags: tags.filter(FILTERS.TAG).sort(function(a, b) {
        return WEIGHTS.TAG(b) - WEIGHTS.TAG(a);
      })
    };
  }

  function searchResultToDOM(searchResult) {
    $container.empty();
    for (var key in searchResult) {
      $container.append(sectionFactory(key.toUpperCase(), searchResult[key]));
    }
  }

  function scrollTo($item) {
    if ($item.length === 0) return;
    var wrapperHeight = $wrapper[0].clientHeight;
    var itemTop = $item.position().top - $wrapper.scrollTop();
    var itemBottom = $item[0].clientHeight + $item.position().top;
    if (itemBottom > wrapperHeight + $wrapper.scrollTop()) {
      $wrapper.scrollTop(itemBottom - $wrapper[0].clientHeight);
    }
    if (itemTop < 0) {
      $wrapper.scrollTop($item.position().top);
    }
  }

  function selectItemByDiff(value) {
    var $items = $.makeArray($container.find(".ins-selectable"));
    var prevPosition = -1;
    $items.forEach(function(item, index) {
      if ($(item).hasClass("active")) {
        prevPosition = index;
        return;
      }
    });
    var nextPosition = ($items.length + prevPosition + value) % $items.length;
    $($items[prevPosition]).removeClass("active");
    $($items[nextPosition]).addClass("active");
    scrollTo($($items[nextPosition]));
  }

  function gotoLink($item) {
    if ($item && $item.length) {
      location.href = $item.attr("data-url");
    }
  }

  $.getJSON(CONFIG.CONTENT_URL, function(json) {
    if (location.hash.trim() === "#ins-search") {
      $main.addClass("show");
    }
    $input.on("input", function() {
      var keywords = $(this).val();
      searchResultToDOM(search(json, keywords));
    });
    $input.trigger("input");
  });

  var isRendered = false;
  function renderBookmark() {
    if (isRendered) return;
    isRendered = true;
    var hList = [].filter.call($('article').find('h2, h3, h4'), function(ele) {
      return ele.textContent.trim().length > 0;
    });
    if (hList.length > 0) {
      var lastTagName = hList[0].tagName.toLowerCase();
      var list = '<ul class="mark-list">';
      hList.forEach(function(item) {
        var currTagName = item.tagName.toLowerCase();
        var text = item.textContent.trim();
        if (currTagName > lastTagName) {
          list += '<ul class="mark-' + currTagName +'">'
          list += '<li class="mark-' + currTagName +'">' + '<a href="#" data-id="#' + item.id + '" title="' + text + '">' + text +'</a>';
        } else if (currTagName === lastTagName) {
          list += '</li><li class="mark-' + currTagName +'">' + '<a href="#" data-id="#' + item.id + '" title="' + text + '">' + text +'</a>';
        } else {
          list += '</ul></li>';
          list += '<li class="mark-' + currTagName +'">' + '<a href="#" data-id="#' + item.id + '" title="' + text + '">' + text +'</a>';
        }
        lastTagName = currTagName;
      });
      list += '</ul>';
      $bookmark.append(list);
    } else {
      $main.find(".ins-bookmark-wrapper").hide();
    }
  }
  renderBookmark();
  $(document)
    .on("click focus", ".search-form-input, .ins-search-icon", function() {
      $main.fadeIn();
      $main.find(".ins-search-input").focus();
    })
    .on("click", ".ins-search-item", function() {
      gotoLink($(this));
    })
    .on("click", ".ins-search-close", function() {
      $main.fadeOut();
    })
    .on("click", ".ins-bookmark-wrapper a", function(ele) {
      var id = $(ele.target).data('id');
      var top = $(id)[0].offsetTop;
      if (top) {
        $main.fadeOut();
        $('html').animate({ scrollTop: top }, 600);
      }
    })
    .on("keydown", function(e) {
      if (!$main.hasClass("show")) return;
      switch (e.keyCode) {
        case 27: // ESC
          $main.removeClass("show");
          break;
        case 38: // UP
          selectItemByDiff(-1);
          break;
        case 40: // DOWN
          selectItemByDiff(1);
          break;
        case 13: //ENTER
          gotoLink($container.find(".ins-selectable.active").eq(0));
          break;
      }
    });
})(jQuery, window.INSIGHT_CONFIG);
