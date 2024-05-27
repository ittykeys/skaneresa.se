/*
 * File: main.js
 * Author: Peter Nilsson (@ittykeys)
 * Date: March 18, 2024
 * License: © 2024 Peter Nilsson, released under the GPLv3 License. See LICENSE file for details.
 * Description: Main js file for site
 */

// Fetch api key
let apiKey;
fetch('/config.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch configuration file');
        }
        return response.json();
    })
    .then(config => {
        if (!config || !config.apiKey) {
            throw new Error('Invalid configuration file or missing API key');
        }
        apiKey = config.apiKey;
        PreloadTrainStations();
    })
    .catch(error => {
        console.error('Error:', error);
    });

// Wait for DOM
document.addEventListener("DOMContentLoaded", function () {
    // JS is not disabled, display things
    var container = document.querySelector('.container');
    if (container) {
        container.classList.remove('hidden');
    }
    document.getElementById('loader').classList.remove('hidden');
    // Handle search button
    var searchButton = document.getElementById("searchButton");
    if (searchButton) {
        searchButton.addEventListener("click", function (event) {
            // Make sure fields are not empty and then search
            var fromField = document.getElementById("from");
            var toField = document.getElementById("to");
            var notification = document.getElementById("notificationMessage");

            if (fromField.value.trim() === "" || toField.value.trim() === "") {
                // Show notification
                notification.textContent = notificationText;
                $('.notification').removeClass('hide').addClass('show');
                setTimeout(function() {
                    $('.notification').addClass('hide');
                }, 3000);
                event.preventDefault();
            } else {
                Search();
            }
        });
    }

    // Focus on from field
    setTimeout(function () {
        document.getElementById('from').focus();
    }, 500);

    // Close notification
    document.getElementById("closeNotification").addEventListener("click", function(event) {
        $('.notification').addClass('hide');
        setTimeout(function() {
            $('.notification').removeClass('show');
        }, 500);
    });

    // Handling reset button
    var reset = document.getElementById("reset");
    if (reset) {
        reset.addEventListener("click", function () {
            Reset();
        });
    } else {
        console.error("Element with ID 'reset' not found.");
    }   
});

// Stations array
var Stations = new Array();

// Setting up AJAX configuration
jQuery(document).ready(function ($) {
    $.support.cors = true;
    try {
        $.ajaxSetup({
            url: "https://api.trafikinfo.trafikverket.se/v2/data.json",
            error: function (msg) {
                if (msg.statusText == "abort") return;
                document.getElementById("error").innerHTML = ("Request failed: " + msg.statusText + "" + msg.responseText);
            }
        });
    }
    catch (e) { document.getElementById("error").innerHTML = ("An error occured when initializing."); }

    // Ui stuff for preload
    var loadingTimer;
    $('#reset').hide();
    $("#main").hide();
    $("#content").hide();
    $('#result').removeClass('shown');
    $(document).ajaxStart(function () {
        loadingTimer = setTimeout(function () {
            $('#loader').show();
        }, 200);
    }).ajaxStop(function () {
        clearTimeout(loadingTimer);
        setTimeout(function () {
            $('#loader').hide();
            $("#main").show();
            $("#content").show();
        }, 200);
    });
});

// Preload train stations
function PreloadTrainStations() {
    var xmlRequest = "<REQUEST>" +
        "<LOGIN authenticationkey='" + apiKey + "'/>" +
        "<QUERY objecttype='TrainStation' schemaversion='1'>" +
        "<FILTER>" +
        "<EQ name='CountyNo' value='12' />" +
        "</FILTER>" +
        "<INCLUDE>Prognosticated</INCLUDE>" +
        "<INCLUDE>AdvertisedLocationName</INCLUDE>" +
        "<INCLUDE>LocationSignature</INCLUDE>" +
        "</QUERY>" +
        "</REQUEST>";
    $.ajax({
        type: "POST",
        contentType: "text/xml",
        dataType: "json",
        data: xmlRequest,
        success: function (response) {
            if (response == null) return;
            try {
                var stationlist = [];
                $(response.RESPONSE.RESULT[0].TrainStation).each(function (iterator, item) {
                    Stations[item.LocationSignature] = item.AdvertisedLocationName;
                    if (item.Prognosticated == true)
                        stationlist.push({ label: item.AdvertisedLocationName, value: item.LocationSignature });
                });
                fillSearchWidget(stationlist);
            }
            catch (ex) { }
        }
    });
}

// Fill search widget with autocomplete
function fillSearchWidget(data) {
    var autocompleteSetup = function (selector) {
        $(selector).val("");
        $(selector).autocomplete({
            source: function (request, response) {
                var matches = $.map(data, function (tag) {
                    if (tag.label.toUpperCase().indexOf(request.term.toUpperCase()) === 0) {
                        return {
                            label: tag.label,
                            value: tag.value
                        }
                    }
                });
                response(matches);
            },
            select: function (event, ui) {
                var selectedObj = ui.item;
                $(selector).val(selectedObj.label);
                $(selector).data("sign", selectedObj.value);
                return false;
            },
            focus: function (event, ui) {
                var selectedObj = ui.item;
                $(selector).val(selectedObj.label);
                return false;
            },
            messages: {
                noResults: '',
                results: function () { }
            }
        });
    };
    autocompleteSetup("#from");
    autocompleteSetup("#to");
}

// Perform search
function Search() {
    var fromSign = $("#from").data("sign");
    var toSign = $("#to").data("sign");
    $('#timeTableDeparture tr:not(:first)').remove();
    $('#loader').show();
    var xmlRequest = "<REQUEST>" +
        "<LOGIN authenticationkey='" + apiKey + "'/>" +
        "<QUERY objecttype='TrainAnnouncement' " +
        "orderby='AdvertisedTimeAtLocation' schemaversion='1'>" +
        "<FILTER>" +
        "<AND>" +
        "<GT name='AdvertisedTimeAtLocation' value='$dateadd(-00:15:00)' />" +
        "<LT name='AdvertisedTimeAtLocation' value='$dateadd(14:00:00)' />" +
        "<EQ name='LocationSignature' value='" + fromSign + "' />" +
        "<EQ name='ActivityType' value='Avgang' />" +
        "<IN name='ToLocation' value='" + toSign + "' />" +
        "</AND>" +
        "<NOT><EQ name='InformationOwner' value='SJ' /></NOT>" +
        "</FILTER>" +
        "<INCLUDE>InformationOwner</INCLUDE>" +
        "<INCLUDE>AdvertisedTimeAtLocation</INCLUDE>" +
        "<INCLUDE>TrackAtLocation</INCLUDE>" +
        "<INCLUDE>FromLocation</INCLUDE>" +
        "<INCLUDE>ToLocation</INCLUDE>" +
        "</QUERY>" +
        "</REQUEST>";

    $.ajax({
        type: "POST",
        contentType: "text/xml",
        dataType: "json",
        data: xmlRequest,
        success: function (response) {
            $('#loader').hide();
            if (response == null || response.RESPONSE.RESULT[0].TrainAnnouncement == null) {
                $("#result").after("");
                return;
            }
            renderTrainAnnouncement(response.RESPONSE.RESULT[0].TrainAnnouncement);
        },
        error: function (msg) {
            $('#loader').hide();
            if (msg.statusText == "abort") return;
            document.getElementById("error").innerHTML = ("Request failed: " + msg.statusText + "" + msg.responseText);
        }
    });
    $('body').removeClass('animate-to-center');
    $('body').addClass('animate-to-top');
    $('.container').addClass('row-layout');
    $('#result').addClass('shown');
    $('#reset').show();

    // Adjust height since results are absolutely positioned
    setTimeout(function () {
        var resultsizer = document.getElementById('result');
        var elementRect = resultsizer.getBoundingClientRect();
        var htmlElement = document.documentElement;
        var htmlRect = htmlElement.getBoundingClientRect();
        var newHeight = Math.max(htmlRect.height, elementRect.bottom);
        htmlElement.style.height = newHeight + 'px';
    }, 100);
}

// Render train announcements
function renderTrainAnnouncement(announcement) {
    $(announcement).each(function (iterator, item) {
        var advertisedtime = new Date(item.AdvertisedTimeAtLocation);
        var hours = advertisedtime.getHours()
        var minutes = advertisedtime.getMinutes()
        if (minutes < 10) minutes = "0" + minutes
        var toList = new Array();
        $(item.ToLocation).each(function (iterator, toItem) {
            toList.push(Stations[toItem]);
        });
        var owner = "";
        if (item.InformationOwner != null) owner = item.InformationOwner;
        jQuery("#timeTableDeparture tr:last").
            after("<tr><td>" + hours + ":" + minutes + "</td><td>" + toList.join(', ') +
                "</td><td>" + owner + "</td><td style='text-align: center'>" + item.TrackAtLocation +
                "</td></tr>");
    });
}

// Toggle filter menu
function Filter() {
    var menu = document.getElementById("filter");
    menu.classList.toggle("shown");
}

// Reset search
function Reset() {
    $('#result').removeClass('shown');
    document.getElementById('from').value = '';
    document.getElementById('to').value = '';
    $('.container').removeClass('row-layout');
    $('body').addClass('animate-to-center');
    $('#reset').hide();
    setTimeout(function () {
        document.getElementById('from').focus();
    }, 500);
}