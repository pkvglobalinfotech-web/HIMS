(function () {
    'use strict';

    angular
        .module('app.pages')
        .controller('PatientUpdateListController', PatientUpdateListController);

    function PatientUpdateListController( $rootScope,$scope, $stateParams, $state, $translate, utl, $filter,$timeout) {
        var vm = this;

        $scope.currentfilter = {
            PatientStatusId: 2,
            RegisteredDate: utl.Formatter.getCurrentDate()
        };
        $scope.selectedPatient = null;
        $scope.isLoading = false;

        $timeout(function () {
            removeFloatingNav();
        }, 100);

        function removeFloatingNav() {
            $rootScope.app.layout.isCollapsed = true;
        }

        // =========================================================================
        // REACT MODERNIZATION BRIDGE: PatientUpdateListScreen
        // =========================================================================
        $scope.refreshReactProps = function () {
            var doUpdate = function () {
                $scope.reactProps = {
                    gridData: angular.copy(vm.gridConfig.data || []),
                    pagerObj: angular.copy(vm.gridConfig.pagerObj || { totalItems: 0, currentPage: 1, startIndex: 0, pageSize: 25 }),
                    currentfilter: angular.copy($scope.currentfilter || {}),
                    lookup: angular.copy($scope.lookup || {}),
                    selectedPatient: angular.copy($scope.selectedPatient || null),
                    isLoading: !!$scope.isLoading
                };
            };
            if ($scope.$$phase) {
                doUpdate();
            } else {
                $scope.$evalAsync(doUpdate);
            }
        };

        $scope.handleReactAction = function (actionName, payload) {
            $scope.$evalAsync(function () {
                switch (actionName) {
                    case 'dateChange':
                        if (payload && payload.date !== undefined) {
                            $scope.currentfilter.RegisteredDate = payload.date;
                            $scope.currentfilter.Patientinfo = null;
                            $scope.selectedPatient = null;
                            vm.gridConfig.pagerObj.currentPage = 1;
                            $scope.getList();
                        }
                        break;
                    case 'statusChange':
                        if (payload && payload.statusId !== undefined) {
                            $scope.currentfilter.PatientStatusId = payload.statusId;
                            vm.gridConfig.pagerObj.currentPage = 1;
                            $scope.getList();
                        }
                        break;
                    case 'patientSelect':
                        if (payload) {
                            $scope.selectedPatient = (typeof payload === 'object') ? payload : null;
                            $scope.currentfilter.Patientinfo = (payload && (payload.Id || payload.MRN)) ? (payload.Id || payload.MRN) : payload;
                            $scope.currentfilter.RegisteredDate = null;
                            vm.gridConfig.pagerObj.currentPage = 1;
                            $scope.getList();
                        }
                        break;
                    case 'patientClear':
                        $scope.selectedPatient = null;
                        $scope.currentfilter.Patientinfo = null;
                        $scope.currentfilter.RegisteredDate = utl.Formatter.getCurrentDate();
                        vm.gridConfig.pagerObj.currentPage = 1;
                        $scope.getList();
                        break;
                    case 'pageChange':
                        if (payload && payload.page) {
                            vm.gridConfig.pagerObj.currentPage = payload.page;
                            $scope.getList();
                        }
                        break;
                    case 'pageSizeChange':
                        if (payload && payload.pageSize) {
                            vm.gridConfig.pagerObj.pageSize = payload.pageSize;
                            vm.gridConfig.pagerObj.currentPage = 1;
                            $scope.getList();
                        }
                        break;
                    case 'edit':
                        if (payload) {
                            $scope.handleEvents('edit', payload);
                        }
                        break;
                    case 'patientinfo':
                        if (payload) {
                            $scope.handleEvents('patientinfo', payload);
                        }
                        break;
                    case 'refresh':
                        $scope.getList();
                        break;
                }
            });
        };

        $scope.getListCallback = function (scope, res, options, hasError) {
            $scope.isLoading = false;
            vm.gridConfig.data = (res && res.Data) || [];
            vm.gridConfig.pagerObj.totalItems = (res && res.PageContext && res.PageContext.TotalRecords) || vm.gridConfig.data.length || 0;
            $scope.refreshReactProps();
        };

        $scope.getList = function (pageNo) {
            $scope.isLoading = true;
            $scope.refreshReactProps();

            var FrRegDt = $filter('date')($scope.currentfilter.RegisteredDate, 'yyyy-MM-dd 00:00:00') || null;
            var ToRegDt = $filter('date')($scope.currentfilter.RegisteredDate, 'yyyy-MM-dd 23:59:59') || null;

            var patKey = 0;
            if ($scope.currentfilter.Patientinfo) {
                $scope.currentfilter.RegisteredDate = null;
                FrRegDt = '';
                ToRegDt = '';
                if ($scope.selectedPatient && $scope.selectedPatient.Id) {
                    patKey = 0;
                } else if (isNaN(Number($scope.currentfilter.Patientinfo))) {
                    patKey = 1;
                } else {
                    patKey = 0;
                }
            }
            var inputData = {
                Params: [{
                        Key: patKey,
                        Value: $scope.currentfilter.Patientinfo
                    },
                    {
                        Key: 9,
                        Value: FrRegDt
                    },
                    {
                        Key: 10,
                        Value: ToRegDt
                    },
                    {
                        Key: 7,
                        Value: $scope.currentfilter.PatientStatusId
                    },
                ],
                PageContext: {
                    PageSize: vm.gridConfig.pagerObj.pageSize,
                    PageNumber: vm.gridConfig.pagerObj.currentPage
                }
            };

            var options = {
                action: 'registration/patient/GetPatients',
                data: inputData,
                type: 'post',
                onComplete: $scope.getListCallback
            };

            utl.Http.doAction(options);
        };

        $scope.handleEvents = function (actionType, entity) {
            if (actionType == 'edit') {
                utl.Modal.open('app.newpatientregister', {
                    params: {
                        id: entity.Id
                    },
                    confirmCallback: $scope.getList
                });
            }
            else if (actionType == 'patientinfo') {
                utl.Modal.open('registration.patientprofile', {
                    params: {
                        pid: entity.Id
                    },
                    confirmCallback: $scope.getList
                });
            }
        };

        vm.gridConfig = {
            enableColumnResizing: true,
            columnDefs: [{
                    field: "index",
                    displayName: $translate.instant('registration.updatepatient.snum.lbl'),
                    cellTemplate: "<div class='ui-grid-cell-contents'><span >{{index+1}}</span> </div>"
                },
                {
                    field: "RegisteredDate",
                    displayName: $translate.instant('registration.updatepatient.date.lbl'),
                    cellTemplate: "<div class='ui-grid-cell-contents'><span >{{entity.RegisteredDate | date : 'dd-MMM-yyyy'}} </span>" + "<span >{{entity.RegisteredDate| date: 'HH:mm'}}</span>" + "</div>"
                },
                {
                    field: "PatientInfo",
                    displayName: $translate.instant('registration.updatepatient.patplaceholder.lbl'),
                    cellTemplate: "<div class='ui-grid-cell-contents'>" +
                        '<a class="grid-action" ng-click="handleEvents(\'patientinfo\',entity)"'+
                        "<span ng-if='entity.Title && entity.Title.Description' >" +
                        "{{entity.Title.Description}}</span>" +
                        "<span >&nbsp;</span>" +
                        "<span >{{entity.FirstName}}</span>" +
                        "<span >&nbsp;</span>" +
                        "<span >{{entity.LastName}}</span>" +
                        "</a></div>",
                        handleEvent: $scope.handleEvents
                },
                {
                    field: "Age",
                    displayName: $translate.instant('registration.updatepatient.age.lbl')
                },
                {
                    field: "Mobile",
                    displayName: $translate.instant('registration.updatepatient.mobile.lbl')
                },
                {
                    field: "MRN",
                    displayName: $translate.instant('registration.updatepatient.patid.lbl')
                },
                {
                    field: "Id",
                    displayName: $translate.instant('common.actions_col.lbl'),
                    cellTemplate: '<div class="ui-grid-cell-contents">\
                            <span class="grid-action" ng-click="handleEvents(\'edit\',entity)"><img src="assets/svg/edit.svg" alt=""></span>\
                        </div>',
                    handleEvent: $scope.handleEvents,
                }
            ],
            pagerObj: {
                totalItems: 0,
                currentPage: 1,
                startIndex: 0,
                pageSize: 25
            }
        };

        $scope.lookupCallback = function (scope, data, options, hasError) {
            $scope.lookup = hasError ? {} : data;
            $scope.refreshReactProps();
            $scope.getList();
        };

        $scope.initLookup = function () {
            var inputData = [{
                "Key": "PatientStatus"
            }];
            var options = {
                action: 'General/Options/getoptions',
                data: inputData,
                type: 'post',
                onComplete: $scope.lookupCallback
            };
            utl.Http.doAction(options);
        };

        $scope.initLookup();
    }

    PatientUpdateListController.$inject = ['$rootScope','$scope', '$stateParams', '$state', '$translate', 'utl', '$filter','$timeout'];

})();