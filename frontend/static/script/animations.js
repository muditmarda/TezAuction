(function ($) {
	"use strict";
	$(document).ready(function() {
		
	
	
	//------------------------------------//
  //Scroll Animations//
  //------------------------------------//
	var $animation_elements = $('.fadeIn, .moveUp, .product-container');
		var $window = $(window);
		
		function check_if_in_view() {
		  var window_height = $window.height();
		  var window_top_position = $window.scrollTop();
		  var window_bottom_position = (window_top_position + window_height);
		 
		  $.each($animation_elements, function() {
		    var $element = $(this);
		    var element_height = $element.outerHeight();
		    var element_top_position = $element.offset().top + 50;
		    var element_bottom_position = (element_top_position + element_height);
		 
		    //check to see if this current container is within viewport
		    if ((element_bottom_position >= window_top_position) &&
		        (element_top_position <= window_bottom_position)) {
		      $element.addClass('in-view');
		    } else {
			      $element.removeClass('in-view');
			    } 
		  });
		  
		  
		}
		
		$window.on('scroll resize', check_if_in_view);
		$window.trigger('scroll');

	
	//------------------------------------//
  //Loading Home Page//
  //------------------------------------//
	setTimeout(function() {
		$('.banner_Txt').addClass('animate');
	}, 0);
	setTimeout(function() {
		$('.italian-icon').addClass('animate');
	}, 500);
	setTimeout(function() {
		$('.block-reveal span').addClass('animate');
	}, 700);
	setTimeout(function() {
		$('.block-reveal .content').addClass('animate');
	}, 1000);
	setTimeout(function() {
		$('.block-reveal .content').removeClass('animate');
	}, 1600);
	
	setTimeout(function() {
		$('.loading-content.drink').addClass('animate');
	}, 1800);
	setTimeout(function() {
		$('.loading-content.drink').removeClass('animate');
	}, 2400);
	
	setTimeout(function() {
		$('.loading-content.shop').addClass('animate');
	}, 2600);
	setTimeout(function() {
		$('.loading-content.shop').removeClass('animate');
	}, 3200);
	
	setTimeout(function() {
		$('.loading-content.learn').addClass('animate');
	}, 3400);
	setTimeout(function() {
		$('.loading-content.learn').removeClass('animate');
	}, 4000);
	setTimeout(function() {
		$('.italian-icon').removeClass('animate');
	}, 4000);
	
	setTimeout(function() {
		$('.landing-bg').removeClass('animate');
	}, 4400);
	setTimeout(function() {
		$('.color-block-1').addClass('animate');
	}, 4600);
	setTimeout(function() {
		$('.color-block-2').addClass('animate');
	}, 4900);
	setTimeout(function() {
		$('.landing-bg').removeClass('animate');
	}, 5000);
	setTimeout(function() {
		$('#landing').addClass('animate');
	}, 5200);
	



	
	//------------------------------------//
	//Parallax//
	//------------------------------------//
	$(window).scroll(function() {
	  var scroll = $(window).scrollTop();
	  $(".parallax").css("transform","translateY(" +  (scroll/3)  + "px)");
	  $(".parallax2").css("transform","translateY(" +  (scroll/5)  + "px)");
	  $(".parallax3").css("transform","translateY(" +  (scroll/8)  + "px)");
	});
	


	
	});
}(jQuery));	