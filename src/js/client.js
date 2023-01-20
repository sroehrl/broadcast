import { Manager } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";
export const lenkradSocketManager = new Manager("ws://[[server]]:[[port]]",{
    autoConnect: false
});

let storeIt = false;
let auth = null;

const debounce = (func, timeout = 300) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}
export const setAuthorizationHeader = (authString) => {
    auth = authString;
}

const updateEntity = debounce((path, entityObject)=>{
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
    if(auth){
        headers['Authorization'] = auth
    }
    fetch(path, {
        method: 'PUT',
        headers,
        body: JSON.stringify(entityObject)
    })
})

export const SyncEntity = async (path) => {
    const j = await fetch(path)
    const dataObj = await j.json()
    const main = lenkradSocketManager.socket(dataObj.lrs.namespace, {auth:{token:dataObj.lrs.token}})
    delete dataObj.lrs;

    let updater = [];

    dataObj.onChange = cb => updater.push(cb);
    main.connect()

    let info = {changed:{}}

    const internalData = watchMe(dataObj, (property, value, previousValue, applyData) => {
        info.changed = {
            property,
            value,
            from: previousValue
        }
        if(previousValue !== value && storeIt){
            updateEntity(path, dataObj)
        }

    })
    main.on('update', (data) => {
        Object.keys(internalData).forEach(key => {
            if(data[key] !== internalData[key] && key !== 'onChange'){
                internalData[key] = data[key]
            }
        })
        updater.forEach(fn => fn(info))
    })
    return internalData;


}


export class HTMLBinder {
    constructor(syncedObject) {
        this.syncedObject = syncedObject;
        this.cb = () => {}
        return this;
    }
    toForm(formSelector){
        const form = document.querySelector(formSelector);
        const formElements = Array.from(form.elements)
        formElements.forEach(element => {
            if (element.nodeType === 1 && this.syncedObject.hasOwnProperty(element.name)){
                let dataProperty = 'checked'
                switch (element.nodeName) {
                    case 'INPUT':
                        dataProperty = element.type === 'checkbox' ? 'checked' : 'value'
                        break;
                    case 'SELECT': dataProperty = 'value'
                        break;

                }
                element[dataProperty] = this.syncedObject[element.name];
                // on external change
                this.syncedObject.onChange(info => {
                    storeIt = false;
                    if(info.changed.property === element.name){
                        element[dataProperty] = this.syncedObject[element.name];
                    }

                })

            }

        })
        form.addEventListener('submit', ev => {
            ev.preventDefault();
            storeIt = true;
            this.cb()
            formElements.forEach(ele => {
                if(this.syncedObject.hasOwnProperty(ele.name)){
                    this.syncedObject[ele.name] = ele.value
                }
            })

        })
        return this;

    }
    toElements(matchObject){
        Object.keys(matchObject).forEach(key => {
            let ele = document.querySelector(key);
            ele.value = this.syncedObject[matchObject[key].property];
            // I do it
            ele.addEventListener(matchObject[key].event || 'blur', ev => {
                storeIt = true;
                this.syncedObject[matchObject[key].property] = ev.target.value;
            })
            // you do it
            this.syncedObject.onChange(info => {
                storeIt = false;
                if(info.changed.property === matchObject[key].property){
                    ele.value = this.syncedObject[matchObject[key].property];
                }

            })
        })
    }
    onSubmit(cb){
        this.cb = cb;
    }
}


const isPrimitive = value => value === null || (typeof value !== 'object' && typeof value !== 'function');
const concatPath = (path, property) => {
    if (property && property.toString) {
        if (path)path += '.';
        path += property.toString();
    }
    return path;
};

const proxyTarget = Symbol('ProxyTarget');

const watchMe = (object, onChange) => {
    let inApply = false;
    let changed = false;
    const propCache = new WeakMap();
    const pathCache = new WeakMap();
    const handleChange = (path, property, previous, value) => {
        if (!inApply) onChange.call(proxy, concatPath(path, property), value, previous);
        else if (!changed)  changed = true;
    };
    const getOwnPropertyDescriptor = (target, property) => {
        let props = propCache.get(target);
        if (props) return props;
        props = new Map();
        propCache.set(target, props);
        let prop = props.get(property);
        if (!prop) {
            prop = Reflect.getOwnPropertyDescriptor(target, property);
            props.set(property, prop);
        }
        return prop;
    };
    const invalidateCachedDescriptor = (target, property) => {
        const props = propCache.get(target);
        if (props) props.delete(property);
    };
    const handler = {
        get(target, property, receiver) {
            if (property === '___target___' ) return target;
            if (property === proxyTarget ) return target;
            const value = Reflect.get(target, property, receiver);
            if (isPrimitive(value) || property === 'constructor') return value;
            // Preserve invariants
            const descriptor = getOwnPropertyDescriptor(target, property);
            if (descriptor && !descriptor.configurable) {
                if (descriptor.set && !descriptor.get) return undefined;
                if (descriptor.writable === false) return value;
            }
            pathCache.set(value, concatPath(pathCache.get(target), property));
            return new Proxy(value, handler);
        },
        set(target, property, value, receiver) {
            if (value && value[proxyTarget] !== undefined) value = value[proxyTarget];
            const previous = Reflect.get(target, property, receiver);
            const result = Reflect.set(target, property, value);
            if (previous !== value) handleChange(pathCache.get(target), property, previous, value);
            return result;
        },
        defineProperty(target, property, descriptor) {
            const result = Reflect.defineProperty(target, property, descriptor);
            invalidateCachedDescriptor(target, property);
            handleChange(pathCache.get(target), property, undefined, descriptor.value);
            return result;
        },
        deleteProperty(target, property) {
            const previous = Reflect.get(target, property);
            const result = Reflect.deleteProperty(target, property);
            invalidateCachedDescriptor(target, property);
            handleChange(pathCache.get(target), property, previous);
            return result;
        },
        apply(target, thisArg, argumentsList) {
            if (!inApply) {
                inApply = true;
                const result = Reflect.apply(target, thisArg, argumentsList);
                if (changed) onChange();
                inApply = false;
                changed = false;
                return result;
            }
            return Reflect.apply(target, thisArg, argumentsList);
        },
    };
    pathCache.set(object, '');
    const proxy = new Proxy(object, handler);
    return proxy;
};
