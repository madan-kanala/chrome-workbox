/*
 Copyright 2016 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

import ErrorFactory from '../../../../lib/error-factory';

const errors = {
  'express-route-requires-absolute-path': `When using ExpressRoute, you must
    provide a path that starts with a '/' character. You can only match
    same-origin requests. For more flexibility, use RegExpRoute.`,
};

export default new ErrorFactory(errors);
