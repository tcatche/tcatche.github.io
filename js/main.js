(function ($) {
    // Caption
    $('.article-entry').each(function(i) {
        $(this).find('img').each(function() {
            if (this.alt) {
                $(this).after('<span class="caption">' + this.alt + '</span>');
            }

            $(this).wrap('<a href="' + this.src + '" title="' + this.alt + '" class="gallery-item"></a>');
        });

    });
    if (typeof lightGallery != 'undefined') {
        var options = {
            selector: '.gallery-item',
        };
        lightGallery($('.article-entry')[0], options);
        lightGallery($('.article-gallery')[0], options);
    }

    // Remove extra main nav wrap
    $('.main-nav-list > li').unwrap();

    // Highlight current nav item
    $('#main-nav > li > .main-nav-list-link').each(function () {
        if($('.page-title-link').length > 0){
            if ($(this).html().toUpperCase() == $('.page-title-link').html().toUpperCase()) {
                $(this).addClass('current');
            } else if ($(this).attr('href') == $('.page-title-link').attr('data-url')) {
                $(this).addClass('current');
            }
        }
    });

    // To top button
    $("#back-to-top").on('click', function () {
        $('html').animate({ scrollTop: 0 }, 600);
    });

    function listenScroll() {
        var top = $('html').scrollTop();
        var h = $('html').height() - window.innerHeight;
        if (top < 10) {
            $('#page-percent').fadeOut();
        } else {
            $('#page-percent').fadeIn();
        }
        var p = (parseInt(top * 100 / h)) + '%';
        $('#page-percent div').css('width', p);
    }
    listenScroll();
    $(document).on('scroll', listenScroll);
})(jQuery);