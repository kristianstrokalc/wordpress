'use strict';

var PAGINATION_LIMIT = 1

angular.module('myApp')
  .controller('AddTopicsCtr', function ($scope, $state, Api, Percolate) {
    console.log('Add New Channel - Topics state')

    /* --------------------------------------
     * Public variables
     * -------------------------------------- */

    $scope.formData = {}
    // Prepare form data
    if( $scope.edit.active === true ) {
      $scope.formData = $scope.edit.channel
    }

    // Users from Percolate
    $scope.percolateUsers = []

    // Categories from WP
    $scope.categories = [
      {
        cat_name: 'Select a category...',
        term_id: ''
      }
    ]

    $scope.isWpmlActive = false

    // Edit mode
    if( $scope.edit.active && $scope.edit.channel ) {
      angular.extend($scope.activeChannel, $scope.edit.channel)
    }


    /* --------------------------------------
     * Private methods
     * -------------------------------------- */

    function apiError (err) {
      $scope.stopLoader()
      $scope.showError(err)
      return
    }

    function pagination(paginationData) {
      if (!paginationData.total) { return false }
      var _pagination = {
        pages: Math.floor(paginationData.total/paginationData.limit) + 1,
        offsets: [],
        activePage: paginationData.offset / paginationData.limit,
      }
      if ( _pagination.activePage > 0) {
        _pagination.prev = {
          label: _pagination.activePage - 1,
          offset: paginationData.offset - paginationData.limit,
          limit: paginationData.limit
        }
      }
      if (_pagination.activePage < _pagination.pages - 2) {
        _pagination.next = {
          label: _pagination.activePage + 1,
          offset: paginationData.offset + paginationData.limit,
          limit: paginationData.limit
        }
      }

      if (_pagination.pages > 10) {
        var _start = 0
        if (_pagination.activePage - 4 > 0) {
          _start = _pagination.activePage - 4
        }

        var _end = _start + 8
        if (_end > _pagination.pages - 1) {
          _end = _pagination.pages - 1
        }

        for (var i = _start; i < _end; i++) {
           _pagination.offsets.push({
             label: i+1,
             offset: paginationData.limit * i,
             limit: paginationData.limit,
             active: paginationData.offset === paginationData.limit * i ? true : false
           })
         }

      } else {

        for (var i = 0; i <_pagination.pages; i++) {
         _pagination.offsets.push({
           label: i+1,
           offset: paginationData.limit * i,
           limit: paginationData.limit,
           active: paginationData.offset === paginationData.limit * i ? true : false
         })
        }

      }
      console.log(_pagination);
      return _pagination
    }

    function processWpUsers (res) {
      $scope.wpUsers = res.data
      if( !$scope.formData.wpUser ) {
        $scope.formData.wpUser = $scope.wpUsers[0].ID
      } else {
        $scope.formData.wpUser = +$scope.formData.wpUser
      }
      console.log('WP users', $scope.wpUsers)
    }

    function processPercolateTopics (res) {
      console.log('Topics', res.data)
      if ($scope.percolateUsers) { $scope.stopLoader() }

      if( !res.data || !res.data.data ) {
        $scope.showError('There was an error.')
        return
      }

      $scope.topics = res.data.data
    }

    function fetchPercolatUsers(paginationData) {
      $scope.showLoader('Loading users from Percolate...')
      $scope.percolateUsers = null
      return Percolate.getUsersByLicense({
        key    : $scope.activeChannel.key,
        license: $scope.activeChannel.license,
        fields : {
          limit: (paginationData && paginationData.limit) ? paginationData.limit : PAGINATION_LIMIT,
          offset: (paginationData && paginationData.offset) ? paginationData.offset : 0
        }
      }).then(processPercolateUsers, apiError)
    }

    function processPercolateUsers(res){
      console.log('Percolate users: ', res)
      if ($scope.topics) $scope.stopLoader()

      if( !res.data || !res.data.data ) {
        $scope.showError('There was an error.')
        return
      }
      $scope.userPagination = pagination(res.data.pagination)
      $scope.percolateUsers = res.data.data
    }

    function processWpCategories(res) {
      // var tree = _unflatten(res.data)
      $scope.categories = $scope.categories.concat(res.data)
      console.log('WP categories', $scope.categories)

      return Api.getWpmlStatus()
    }

    function processWpCategoriesByLanguage () {
      $scope.categoriesByLanguage = {}
      _.each($scope.categories, function(cat) {
        if (cat.language) {
          if (!$scope.categoriesByLanguage[cat.language]) {
            $scope.categoriesByLanguage[cat.language] = []
          }
          $scope.categoriesByLanguage[cat.language].push(cat)
        }
      })

      console.log($scope.categoriesByLanguage);
    }

    function getWpmlStatus (res) {
      console.log('WPML status', res)
      $scope.isWpmlActive = (res.data === 'true')

      if (res) {
        processWpCategoriesByLanguage()
      }
    }


    function _unflatten( array, parent, tree ){

      tree = typeof tree !== 'undefined' ? tree : [];
      parent = typeof parent !== 'undefined' ? parent : { id: 0 };

      var children = $scope._.filter( array, function(child){ return child.parentid == parent.id; });

      if( !$scope._.isEmpty( children )  ){
          if( parent.id == 0 ){
             tree = children;
          }else{
             parent['children'] = children
          }
          $scope._.each( children, function( child ){ _unflatten( array, child ) } );
      }

      return tree;
    }

    /* --------------------------------------
     * Public methods
     * -------------------------------------- */

    /*
     * Populate object in parent scope
     */
    $scope.submitForm = function (form) {
      // Trigger validation flag.
      $scope.submitted = true

      // If form is invalid, return and let AngularJS show validation errors.
      if( form.$invalid ) {
        return
      }

      // extend new channel object
      if( $scope.formData ) {
        angular.extend($scope.activeChannel, $scope.formData)
      }
      console.log('Submiting form, current dataset: ', $scope.activeChannel)
      $state.go('add.templates')
    }

    /* --------------------------------------
     * Bootstrap
     * -------------------------------------- */


    angular.extend($scope, {
      fetchPercolatUsers: fetchPercolatUsers
    })

     // Check if we have the active User
     if( !$scope.activeChannel.user ) {
       $scope.showError('No active user found.')
       $state.go('manage')
     }

    // Get Percolate topics
    $scope.showLoader('Loading data from Percolate...')
    Percolate.getTopics({
      key    : $scope.activeChannel.key,
      fields : {
        owner_uid: 'license:' + $scope.activeChannel.license
      }
    }).then(processPercolateTopics, apiError)

    fetchPercolatUsers()

    // Get WP users
    Api.getUsers().then(processWpUsers, apiError)

    // Categories from WP
    Api.getCategories()
      .then(processWpCategories, apiError)
      .then(getWpmlStatus, apiError)
  })
