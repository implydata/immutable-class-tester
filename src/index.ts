/*
 * Copyright 2014-2015 Metamarkets Group Inc.
 * Copyright 2015-2019 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import hasOwnProp from 'has-own-prop';

export interface TesterOptions {
  newThrows?: boolean;
  context?: any;
}

const PROPERTY_KEYS: string[] = [
  'name',
  'defaultValue',
  'possibleValues',
  'validate',
  'immutableClass',
  'immutableClassArray',
  'immutableClassLookup',
  'equal',
  'toJS',
  'type',
  'contextTransform',
  'preserveUndefined',
  'emptyArrayIsOk',
];

/**
 * Checks it a given Class conforms to the Immutable Class guidelines by applying it to a given set of instances
 * @param ClassFn - The constructor function of the class to test
 * @param objects - An array of JS values to test on
 * @param options - Some testing options
 */
export function testImmutableClass<TypeJS>(
  ClassFn: any,
  objects: TypeJS[],
  options: TesterOptions = {},
) {
  if (typeof ClassFn !== 'function') throw new TypeError(`ClassFn must be a constructor function`);
  if (!Array.isArray(objects) || !objects.length) {
    throw new TypeError(`objects must be a non-empty array of js to test`);
  }
  const newThrows = options.newThrows;
  const context = options.context;

  // Check class name
  const className = ClassFn.name;
  if (className.length < 1) throw new Error(`Class must have a name of at least 1 letter`);

  // Check static methods
  expect(typeof ClassFn.fromJS).toEqual('function');

  // Check instance methods
  const instance = ClassFn.fromJS(objects[0], context);
  const objectProto = Object.prototype;
  expect(instance.valueOf).not.toEqual(objectProto.valueOf);
  expect(instance.toString).not.toEqual(objectProto.toString);
  expect(typeof instance.toJS).toEqual('function');
  expect(typeof instance.toJSON).toEqual('function');
  expect(typeof instance.equals).toEqual('function');

  // Check properties
  if (ClassFn.PROPERTIES) {
    // Only new style classes have these
    expect(Array.isArray(ClassFn.PROPERTIES)).toBeTruthy();
    ClassFn.PROPERTIES.forEach((property: any) => {
      Object.keys(property).forEach(key => {
        expect(PROPERTY_KEYS.includes(key)).toBeTruthy();
        expect(typeof property.name).toEqual('string');
      });
    });
  }

  // Preserves
  for (let i = 0; i < objects.length; i++) {
    const objectJSON = JSON.stringify(objects[i]);
    const objectCopy1 = JSON.parse(objectJSON);
    const objectCopy2 = JSON.parse(objectJSON);

    const inst = ClassFn.fromJS(objectCopy1, context);
    expect(objectCopy1).toEqual(objectCopy2);

    expect(inst instanceof ClassFn).toBeTruthy();

    expect(typeof inst.toString()).toEqual('string');

    expect(inst.equals(null)).toEqual(false);

    expect(inst.equals([])).toEqual(false);

    expect(inst.toJS()).toEqual(objects[i]);

    const instValueOf = inst.valueOf();
    expect(inst.equals(instValueOf)).toEqual(false);

    const instLazyCopy: any = {};
    for (const key in inst) {
      if (!hasOwnProp(inst, key)) continue;
      instLazyCopy[key] = inst[key];
    }

    expect(inst.equals(instLazyCopy)).toEqual(false);

    if (newThrows) {
      expect(() => {
        return new ClassFn(instValueOf);
      }).toThrowError();
    } else {
      const instValueCopy = new ClassFn(instValueOf);
      expect(inst.equals(instValueCopy)).toEqual(true);
      expect(instValueCopy.toJS()).toEqual(inst.toJS());
    }

    const instJSONCopy = ClassFn.fromJS(JSON.parse(JSON.stringify(inst)), context);
    expect(inst.equals(instJSONCopy)).toEqual(true);
    expect(instJSONCopy.toJS()).toEqual(inst.toJS());
  }

  // Objects are equal only to themselves
  for (let j = 0; j < objects.length; j++) {
    const objectJ = ClassFn.fromJS(objects[j], context);
    for (let k = j; k < objects.length; k++) {
      const objectK = ClassFn.fromJS(objects[k], context);
      expect(objectJ.equals(objectK)).toEqual(j === k);
    }
  }
}
