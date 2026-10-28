(function () {
    'use strict';

    angular
        .module('app.pages')
        .controller('surgeryschedulecalendarController', surgeryschedulecalendarController)
        .directive('calendar', calendarDirective);

    function surgeryschedulecalendarController($rootScope, $scope, $stateParams, $state, $translate, utl, $timeout, $filter) {
        var vm = this;
        // angular.extend(this, utl.Ctrl.getPrivilegeCtrl({ $scope: $scope }));

        $scope.currentcontext = {

        };
        $scope.eventSources = [];
        $scope.calendarEvents = [];
        $scope.currentfilter = {
            FacilityId: parseInt(utl.Session.getCurrentFacilityId()),
            // fromdate: utl.Formatter.getCurrentDate(),
            // todate: utl.Formatter.getCurrentDate()
            fromdate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            todate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        };
        $scope.statusFilters = {};
        $scope.calendarEvents = [];
        $scope.getListCallback = function (scope, res, options, hasError) {
            $scope.item = res.Data || [];
            $scope.calendarEvents = $scope.item.map(function (event) {
                var color = '';
                switch (event.OTScheduleStatusId) {
                    case 2: color = '#f39c12'; break;
                    case 3: color = '#00c0ef'; break;
                    case 4: color = '#dd4b39'; break;
                    case 5: color = '#00a65a'; break;
                    default: color = '#999';
                }
                var patientFirstName = '';
                var patientLastName = '';
                var patientTitleDesc = '';
                if (event.Patient) {
                    patientFirstName = event.Patient.FirstName || '';
                    patientLastName = event.Patient.LastName || '';
                    if (event.Patient.Title) {
                        patientTitleDesc = event.Patient.Title.Description || '';
                    }
                }
                var doctorNames = '';
                var procedureNames = '';

                if (Array.isArray(event.OtScheduleDetails)) {
                    doctorNames = event.OtScheduleDetails
                        .map(function (d) { return d.ChiefSurgeonName || ''; })
                        .filter(Boolean)
                        .join(', ');

                    procedureNames = event.OtScheduleDetails
                        .map(function (d) { return d.ProcedureName || ''; })
                        .filter(Boolean)
                        .join(', ');
                }
                var statusDesc = '';
                if (event.OTScheduleStatus) {
                    statusDesc = event.OTScheduleStatus.Description || '';
                }
                var otRoomName = '';
                if (event.SurgeryRoomMaster) {
                    otRoomName = event.SurgeryRoomMaster.Name || '';
                }
                return {
                    id: event.Id,
                    title: patientFirstName + ' - ' + procedureNames,
                    start: combineDateTime(event.OTScheduledOn, event.StartTime),
                    end: combineDateTime(event.OTScheduledOn, event.EndTime),
                    status: statusDesc,
                    allDay: false,
                    backgroundColor: color,
                    borderColor: color,

                    PatientName: patientTitleDesc + ' ' + patientFirstName + ' ' + patientLastName,
                    DoctorName: doctorNames,
                    OTRoom: otRoomName,
                    Procedure: procedureNames
                };
            });
            console.log('Calendar Events:', $scope.calendarEvents);
            $scope.refreshReactProps();
        };
        function combineDateTime(dateStr, timeStr) {
            if (!dateStr || !timeStr) return null;
            var date = new Date(dateStr);
            var [hours, minutes, seconds] = timeStr.split(':');
            date.setHours(+hours);
            date.setMinutes(+minutes);
            date.setSeconds(+seconds || 0);
            return date;
        }
        $scope.statusOptions = [
            { id: -1, name: 'All', selected: true },
            { id: 2, name: 'Scheduled', selected: false },
            { id: 3, name: 'Confirmed', selected: false },
            { id: 4, name: 'Cancelled', selected: false },
            { id: 5, name: 'Completed', selected: false }
        ];
        $scope.updateStatusFilters = function () {
            // Collect selected ids
            var selectedStatusIds = $scope.statusOptions
                .filter(option => option.selected)
                .map(option => option.id);

            // Optional: Handle 'All' override logic
            if (selectedStatusIds.includes(-1)) {
                $scope.currentfilter.OTScheduleStatusId = -1;
            } else {
                $scope.currentfilter.OTScheduleStatusId = selectedStatusIds;
            }

            $scope.getList();
        };
        $scope.filterByStatus = function (statusId) {
            $scope.currentfilter.OTScheduleStatusId = statusId;
            $scope.getList();
        };
        $scope.currentfilter.OTRoomId = $scope.currentfilter.OTRoomId || [];

        $scope.toggleRoomSelection = function (roomId) {
            var index = $scope.currentfilter.OTRoomId.indexOf(roomId);
            if (index > -1) {
                $scope.currentfilter.OTRoomId.splice(index, 1);
            } else {
                $scope.currentfilter.OTRoomId.push(roomId);
            }
            $scope.getList();
        };
        $scope.getList = function () {
            var From = $filter('date')($scope.currentfilter.fromdate, 'yyyy-MM-dd 00:00:00') || null;
            var To = $filter('date')($scope.currentfilter.todate, 'yyyy-MM-dd 23:59:59') || null;
            var inputData = {
                Params: [
                    { Key: 20, Value: $scope.currentfilter.OTRoomId.join(',') },
                    { Key: 19, Value: $scope.currentfilter.DoctorId },
                    { Key: 4, Value: $scope.currentfilter.FacilityId },
                    { Key: 2, Value: $scope.currentfilter.OTScheduleStatusId },
                    { Key: 10, Value: From },
                    { Key: 11, Value: To },
                    { Key: 18, Value: false },
                ]
            };
            var options = {
                action: 'OtManagement/OtSchedule/GetOtSchedules',
                data: inputData,
                type: 'post',
                onComplete: $scope.getListCallback
            };
            utl.Http.doAction(options);
        };
        $scope.lookupCallback = function (scope, data, options, hasError) {
            $scope.lookup = hasError ? {} : data;
            if ($scope.lookup && $scope.lookup.User && $scope.lookup.User.length > 0) {
                if ($scope.lookup.User[1].UserTypeId === 2) {
                    $scope.currentfilter.DoctorId = [utl.Session.getCurrentUserId()];
                }
            } else {
                $scope.currentfilter.DoctorId = [];
            }
            $scope.refreshReactProps();
            $scope.getList();
        }
        $timeout(function () {
            if (window.$ && $.fn && typeof $.fn.datepicker === 'function' && $("#datepicker").length) {
                $("#datepicker").datepicker({
                    onSelect: function (dateText) {
                        var selectedDate = new Date(dateText);
                        if ($.fn && typeof $.fn.fullCalendar === 'function' && $('#calendar').length) {
                            $('#calendar').fullCalendar('gotoDate', selectedDate);
                        }
                    },
                    numberOfMonths: 1,
                    showButtonPanel: true
                });

                $(document).on('click', '.ui-datepicker-current', function () {
                    var today = new Date();
                    if ($.fn && typeof $.fn.datepicker === 'function' && $('#datepicker').length) {
                        $('#datepicker').datepicker('setDate', today);
                    }
                    if ($.fn && typeof $.fn.fullCalendar === 'function' && $('#calendar').length) {
                        $('#calendar').fullCalendar('gotoDate', today);
                    }
                });
            }
        }, 50);

        $scope.initLookup = function () {
            var inputData = [
                {
                    "Key": "SurgeryRoom"
                },
                {
                    "Key": "Doctor",
                    Request: {
                        Params: [{
                            Key: 2,
                            Value: utl.Session.getCurrentFacilityId()
                        }]
                    }
                },
                {
                    "Key": "User",
                    Request: {
                        Params: [{
                            Key: 0,
                            Value: utl.Session.getCurrentUserId()
                        }]
                    }
                },
                {
                    "Key": "OTScheduleStatus"
                },
            ];

            var options = {
                action: 'General/Options/getoptions',
                data: inputData,
                type: 'post',
                onComplete: $scope.lookupCallback
            };
            utl.Http.doAction(options);
            $scope.$watch('eventSources', function (newVal, oldVal) {
                if (newVal !== oldVal && $scope.myCalendar && $scope.myCalendar.fullCalendar) {
                    $scope.myCalendar.fullCalendar('refetchEvents');
                }
            }, true);
        }
        $scope.onCalendarDoubleClick = function (event) {
            if (event.isEmptySlot) {
                var OTScheduledOn = '';
                var StartTime = '08:00';
                var EndTime = '09:00';
                function pad(n) { return n < 10 ? '0' + n : '' + n; }

                if (event.start && typeof event.start.format === 'function') {
                    OTScheduledOn = event.start.format('YYYY-MM-DD');
                    StartTime = event.start.format('HH:mm');
                    EndTime = (event.end && typeof event.end.format === 'function') ? event.end.format('HH:mm') : '';
                } else if (event.start) {
                    var sDate = new Date(event.start);
                    OTScheduledOn = sDate.getFullYear() + '-' + pad(sDate.getMonth() + 1) + '-' + pad(sDate.getDate());
                    StartTime = pad(sDate.getHours()) + ':' + pad(sDate.getMinutes());
                    if (event.end) {
                        var eDate = new Date(event.end);
                        EndTime = pad(eDate.getHours()) + ':' + pad(eDate.getMinutes());
                    } else {
                        EndTime = pad((sDate.getHours() + 1) % 24) + ':' + pad(sDate.getMinutes());
                    }
                } else {
                    var today = new Date();
                    OTScheduledOn = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
                }

                // Check if selected slot is in the past
                var now = new Date();
                var slotDate = new Date(OTScheduledOn + 'T' + (StartTime || '00:00') + ':00');
                if (slotDate < now) {
                    utl.Alert.showErrorMsg('Cannot schedule surgery in past date and time.');
                    return;
                }

                event.OTScheduledOn = OTScheduledOn;
                event.StartTime = StartTime;
                event.EndTime = EndTime;
                console.log("Selected from:", event.OTScheduledOn, event.StartTime, "to:", event.EndTime);
                $scope.addNew(event);
            } else {
                console.log("Clicked event:", event);
                $scope.editOld(event);
            }
        };
        $scope.openModal = function (event) {
            utl.Modal.open('app.surgeryschedulecal', {
                params: {
                    id: 0,
                    event: event
                },
                confirmCallback: $scope.initLookup
            }
            );
        }
        $scope.addNew = function (event) {
            $scope.openModal(event);
        }
        $scope.openModals = function (event) {
            utl.Modal.open('app.surgeryconfirmationcal', {
                params: {
                    id: event.id
                },
                confirmCallback: $scope.initLookup
            }
            );
        }
        $scope.editOld = function (event) {
            $scope.openModals(event);
        };

        $scope.reactProps = {
            calendarEvents: [],
            lookup: {},
            currentfilter: $scope.currentfilter
        };

        $scope.refreshReactProps = function () {
            $scope.reactProps = {
                calendarEvents: $scope.calendarEvents || [],
                lookup: $scope.lookup || {},
                currentfilter: angular.copy($scope.currentfilter)
            };
        };

        $scope.handleReactAction = function (actionName, payload) {
            if (actionName === 'filterByDoctor') {
                $scope.currentfilter.DoctorId = payload === -1 ? [] : [payload];
                $scope.getList();
            } else if (actionName === 'toggleRoom') {
                $scope.toggleRoomSelection(payload);
            } else if (actionName === 'filterByStatus') {
                $scope.filterByStatus(payload);
            } else if (actionName === 'addEvent') {
                $scope.addNew(payload);
            } else if (actionName === 'editEvent') {
                $scope.editOld(payload);
            } else if (actionName === 'openConfirmation') {
                $scope.openModals(payload);
            } else if (actionName === 'refresh') {
                $scope.getList();
            }
        };

        $scope.initLookup();
    }

    surgeryschedulecalendarController.$inject = ['$rootScope', '$scope', '$stateParams', '$state', '$translate', 'utl', '$timeout', '$filter'];
    calendarDirective.$inject = ['$timeout'];
    function calendarDirective($timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                let lastDayClickTime = 0;
                let lastDayClickDate = null;

                function updateEvents(events) {
                    if (window.$ && $.fn && typeof $.fn.fullCalendar === 'function' && $(element).length && $(element).data('fullCalendar')) {
                        $(element).fullCalendar('removeEvents');
                        $(element).fullCalendar('addEventSource', events || []);
                        $(element).fullCalendar('refetchEvents');
                    }
                }

                scope.$watch('calendarEvents', function (events) {
                    updateEvents(events);
                }, true);

                $timeout(function () {
                    if (window.$ && $.fn && typeof $.fn.fullCalendar === 'function' && $(element).length) {
                        $(element).fullCalendar({
                            header: {
                                left: 'prev,next today',
                                center: 'title',
                                right: 'month,agendaWeek,agendaDay'
                            },
                            views: {
                                month: { buttonText: 'Month' },
                                agendaWeek: { buttonText: 'Week', allDayText: 'Full day' },
                                agendaDay: { buttonText: 'Day', allDayText: 'Full day' }
                            },
                            defaultView: 'month',
                            editable: false,
                            eventLimit: true,
                            height: 720,
                            events: scope.calendarEvents || [],
                            selectable: true,
                            selectHelper: true,
                            select: function (start, end, jsEvent, view) {
                                if (view.name === 'month') {
                                    $(element).fullCalendar('unselect');
                                    return;
                                }
                                const duration = end.diff(start, 'minutes');
                                if (duration >= 15) {
                                    scope.$apply(function () {
                                        scope.onCalendarDoubleClick({
                                            start: start,
                                            end: end,
                                            isEmptySlot: true
                                        });
                                    });
                                }
                                $(element).fullCalendar('unselect');
                            },
                            eventRender: function (event, el) {
                                el.on('click', function (e) {
                                    scope.$apply(function () {
                                        scope.onCalendarDoubleClick(event);
                                    });
                                });
                            },
                            dayClick: function (date, jsEvent, view) {
                                const now = new Date().getTime();
                                if (lastDayClickDate && date.isSame(lastDayClickDate) && (now - lastDayClickTime) < 300) {
                                    scope.$apply(function () {
                                        scope.onCalendarDoubleClick({
                                            start: date,
                                            isEmptySlot: true
                                        });
                                    });
                                }
                                lastDayClickTime = now;
                                lastDayClickDate = date;
                            },
                            eventMouseover: function (event, jsEvent) {
                                var tooltipContent =
                                    '<strong>Patient:</strong> ' + (event.PatientName || '-') + '<br>' +
                                    '<strong>Doctor:</strong> ' + (event.DoctorName || '-') + '<br>' +
                                    '<strong>OT Room:</strong> ' + (event.OTRoom || '-') + '<br>' +
                                    '<strong>Procedure:</strong> ' + (event.Procedure || '-') + '<br>' +
                                    '<strong>Status:</strong> ' + (event.status || '-');

                                var $tooltip = $('<div class="fc-tooltip">' + tooltipContent + '</div>')
                                    .appendTo('body');

                                $(this).on('mousemove.tooltip', function (e) {
                                    $tooltip.css({
                                        top: e.pageY + 12,
                                        left: e.pageX + 12
                                    });
                                });
                            },
                            eventMouseout: function (event, jsEvent) {
                                $('.fc-tooltip').remove();
                                $(this).off('mousemove.tooltip');
                            }
                        });
                    }
                }, 50);
            }
        };
    }

})();