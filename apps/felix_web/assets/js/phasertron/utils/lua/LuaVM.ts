import * as fengari from 'fengari-web';
export const lua = fengari.lua;
export const lauxlib = fengari.lauxlib;
export const lualib = fengari.lualib;

export type LuaVMState = any;

export interface ILuaVM {
  execute(code: string): void;
  callFunction(functionName: string, ...args: any[]): any;
  registerHook(name: string, fn: (...args: any[]) => any): void;
  unregisterHook(name: string): void;
  getGlobal(variableName: string): any;
  dispose(): void;
}

export default class LuaVM implements ILuaVM {
  private state: LuaVMState;

  constructor() {
    this.state = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(this.state);

    this.seedPolyfills();
  }

  private seedPolyfills = () => {
    this.registerHook('unixTime', () => Date.now());
    this.registerHook('warn', console.warn);
    this.registerHook('throw', (msg: string) => {
      throw new Error(`LuaVM :: "${msg}"`);
    });
    this.execute(`
    function shallowCopy(original)
        local copy = {}
        for key, value in pairs(original) do
            copy[key] = value
        end
        return copy
    end
    `);
  };

  public execute(code: string): void {
    const resultCode = lauxlib.luaL_loadstring(
      this.state,
      fengari.to_luastring(code)
    );
    if (resultCode) {
      throw new Error(lua.lua_tojsstring(this.state, -1));
    }
    lua.lua_call(this.state, 0, 0);
  }

  public callFunction(functionName: string, ...args: any[]): any {
    lua.lua_getglobal(this.state, fengari.to_luastring(functionName));

    for (const arg of args) {
      if (arg instanceof Array) {
        lua.lua_createtable(this.state, arg.length, 0);
        for (let i = 0; i < arg.length; i++) {
          this.pushValueToLua(this.state, arg[i]);
          lua.lua_rawseti(this.state, -2, i + 1);
        }
      } else if (typeof arg === 'object') {
        const handleNestedTable = (nestedTable: any) => {
          for (const key in nestedTable) {
            const value = nestedTable[key];
            switch (typeof value) {
              case 'boolean':
                lua.lua_pushboolean(this.state, value ? 1 : 0);
                break;
              case 'number':
                lua.lua_pushnumber(this.state, value);
                break;
              case 'string':
                lua.lua_pushstring(this.state, fengari.to_luastring(value));
                break;
              case 'object':
                if (value instanceof Array) {
                  lua.lua_createtable(this.state, value.length, 0);
                  for (let i = 0; i < value.length; i++) {
                    this.pushValueToLua(this.state, value[i]);
                    lua.lua_rawseti(this.state, -2, i + 1);
                  }
                } else {
                  lua.lua_createtable(this.state, 0, Object.keys(value).length);
                  handleNestedTable(value);
                }
                break;
              default:
                throw new Error('Unsupported value type in dictionary');
            }
            lua.lua_setfield(this.state, -2, fengari.to_luastring(key));
          }
        };

        lua.lua_createtable(this.state, 0, Object.keys(arg).length);
        handleNestedTable(arg);
      } else {
        switch (typeof arg) {
          case 'boolean':
            lua.lua_pushboolean(this.state, arg ? 1 : 0);
            break;
          case 'number':
            lua.lua_pushnumber(this.state, arg);
            break;
          case 'string':
            lua.lua_pushstring(this.state, fengari.to_luastring(arg));
            break;
          default:
            throw new Error('Unsupported argument type');
        }
      }
    }

    if (lua.lua_pcall(this.state, args.length, 1, 0) !== 0) {
      throw new Error(lua.lua_tojsstring(this.state, -1));
    }

    const type = lua.lua_type(this.state, -1);
    let returnValue: any;
    switch (type) {
      case lua.LUA_TNIL:
        returnValue = null;
        break;
      case lua.LUA_TBOOLEAN:
        returnValue = lua.lua_toboolean(this.state, -1) !== 0;
        break;
      case lua.LUA_TNUMBER:
        returnValue = lua.lua_tonumber(this.state, -1);
        break;
      case lua.LUA_TSTRING:
        returnValue = lua.lua_tojsstring(this.state, -1);
        break;
      case lua.LUA_TTABLE:
        returnValue = {};
        lua.lua_pushnil(this.state); // first key
        while (lua.lua_next(this.state, -2) !== 0) {
          // uses 'key' (at index -2) and 'value' (at index -1)
          const keyType = lua.lua_type(this.state, -2);
          const valueType = lua.lua_type(this.state, -1);
          let key, value;

          // Process key
          switch (keyType) {
            case lua.LUA_TNUMBER:
              key = lua.lua_tonumber(this.state, -2) - 1;
              break;
            case lua.LUA_TSTRING:
              key = lua.lua_tojsstring(this.state, -2);
              break;
            default:
              // Unsupported key type; you might want to handle this differently
              throw new Error('Unsupported key type in table');
          }

          // Process value
          switch (valueType) {
            case lua.LUA_TBOOLEAN:
              value = lua.lua_toboolean(this.state, -1) !== 0;
              break;
            case lua.LUA_TNUMBER:
              value = lua.lua_tonumber(this.state, -1);
              break;
            case lua.LUA_TSTRING:
              value = lua.lua_tojsstring(this.state, -1);
              break;
            // Consider recursion for nested tables
            // Note: This simplistic approach doesn't handle circular references or deep nesting well
            case lua.LUA_TTABLE:
              // Placeholder for handling nested tables; consider a recursive approach
              value = 'Nested tables need specific handling';
              break;
            default:
              throw new Error('Unsupported value type in table');
          }

          returnValue[key] = value;
          lua.lua_pop(this.state, 1); // removes 'value'; keeps 'key' for next iteration
        }

        // Lua represents arrays AND objects both as `TTABLE`.
        // This method will guess if we should convert the table to an array by checking for sequential keys (0, 1, 2,...)
        returnValue = this.maybeConvertObjectToArray(returnValue);
        break;
      default:
        throw new Error('Unsupported return type');
    }

    lua.lua_pop(this.state, 1); // Pop the returned value from stack
    return returnValue;
  }

  private maybeConvertObjectToArray(obj: any) {
    // check if the keys are numbers and in sequential order
    const keys = Object.keys(obj);
    const keysAsNums = keys.map(Number).filter((x) => !isNaN(x));

    if (keys.length !== keysAsNums.length) {
      return obj;
    }

    let last = -1;
    for (let i = 0; i < keysAsNums.length; i++) {
      if (last >= keysAsNums[i]) {
        return obj;
      }
      last = keysAsNums[i];
    }

    // Made it here, we are an array
    const result: any[] = [];
    for (let i = 0; i < keys.length; i++) {
      result.push(obj[i]);
    }
    return result;
  }

  private createJSFuncAndSendResultToLua = (fn: any) => (luaState: any) => {
    const argCount = lua.lua_gettop(luaState);
    const args = [];

    for (let i = 1; i <= argCount; i++) {
      if (lua.lua_isnumber(luaState, i)) {
        args.push(lua.lua_tonumber(luaState, i));
      } else if (lua.lua_isstring(luaState, i)) {
        args.push(lua.lua_tojsstring(luaState, i));
      } else if (lua.lua_isboolean(luaState, i)) {
        args.push(lua.lua_toboolean(luaState, i) !== 0);
      } else {
        args.push(null);
      }
    }

    const result = fn(...args);

    if (typeof result === 'number') {
      lua.lua_pushnumber(luaState, result);
    } else if (typeof result === 'string') {
      lua.lua_pushstring(luaState, fengari.to_luastring(result));
    } else if (typeof result === 'boolean') {
      lua.lua_pushboolean(luaState, result ? 1 : 0);
    } else if (Array.isArray(result)) {
      lua.lua_createtable(luaState, result.length, 0);
      result.forEach((item, index) => {
        this.pushValueToLua(luaState, item);
        lua.lua_rawseti(luaState, -2, index + 1);
      });
    } else if (typeof result === 'object') {
      lua.lua_createtable(luaState, 0, Object.keys(result).length);
      Object.entries(result).forEach(([key, value]) => {
        if (typeof value === 'function') {
          // need to create a new function that can be called from lua which calls the original function
          lua.lua_pushjsclosure(
            luaState,
            this.createJSFuncAndSendResultToLua(value),
            0,
            [fengari.to_luastring(key)]
          );
          lua.lua_setfield(luaState, -2, fengari.to_luastring(key));
        } else {
          this.pushValueToLua(luaState, value);
          lua.lua_setfield(luaState, -2, fengari.to_luastring(key));
        }
      });
    } else {
      return 0; // Unsupported type
    }

    return 1; // Return the number of results
  };

  public registerHook(name: string, fn: (...args: any[]) => any): void {
    lua.lua_pushjsfunction(this.state, this.createJSFuncAndSendResultToLua(fn));
    lua.lua_setglobal(this.state, fengari.to_luastring(name));
  }

  private pushValueToLua(luaState: any, value: any): void {
    if (typeof value === 'number') {
      lua.lua_pushnumber(luaState, value);
    } else if (typeof value === 'string') {
      lua.lua_pushstring(luaState, fengari.to_luastring(value));
    } else if (typeof value === 'boolean') {
      lua.lua_pushboolean(luaState, value ? 1 : 0);
    } else if (Array.isArray(value)) {
      lua.lua_createtable(luaState, value.length, 0);
      value.forEach((item, index) => {
        this.pushValueToLua(luaState, item);
        lua.lua_rawseti(luaState, -2, index + 1);
      });
    } else if (typeof value === 'object' && value !== null) {
      lua.lua_createtable(luaState, 0, Object.keys(value).length);
      Object.entries(value).forEach(([key, val]) => {
        this.pushValueToLua(luaState, val);
        lua.lua_setfield(luaState, -2, fengari.to_luastring(key));
      });
    } else {
      console.log(
        'Got value of type: ' +
          typeof value +
          ', unsupported, pushing nil instead'
      );
      lua.lua_pushnil(luaState);
    }
  }

  public unregisterHook(name: string): void {
    lua.lua_pushnil(this.state);
    lua.lua_setglobal(this.state, fengari.to_luastring(name));
  }

  public getGlobal(variableName: string): any {
    lua.lua_getglobal(this.state, fengari.to_luastring(variableName));
    const type = lua.lua_type(this.state, -1);

    let returnValue;
    switch (type) {
      case lua.LUA_TNUMBER:
        returnValue = lua.lua_tonumber(this.state, -1);
        break;
      case lua.LUA_TSTRING:
        returnValue = fengari.lua_tojsstring(this.state, -1);
        break;
      default:
        throw new Error('Unsupported variable type');
    }

    lua.lua_pop(this.state, 1); // Pop the value from stack
    return returnValue;
  }

  public dispose(): void {
    lua.lua_close(this.state);
  }
}
