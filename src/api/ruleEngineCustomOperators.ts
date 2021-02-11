export const customOperators: { [operatorName: string]: any } = {
    dateIsNotAfter: (factValue: any, jsonValue: any) => {
        if (factValue instanceof Array && jsonValue instanceof Array) {
            if (factValue.length === jsonValue.length) {
                let valid = true;
                factValue.forEach((fact, index) => {
                    valid = valid && new Date(fact) <= new Date(jsonValue[index]);
                });

                return valid;
            }
        } else if (jsonValue instanceof Array) {
            // compares a single date is not after a list of dates
            const factDt = new Date(factValue);

            let valid = true;
            jsonValue.forEach((jsonDt) => {
                valid = valid && factDt <= new Date(jsonDt);
            });

            return valid;
        }
        return new Date(factValue) <= new Date(jsonValue);
    },
    dateIsNotBefore: (factValue: any, jsonValue: any) => {
        if (factValue instanceof Array && jsonValue instanceof Array) {
            if (factValue.length === jsonValue.length) {
                let valid = true;
                factValue.forEach((fact, index) => {
                    valid = valid && new Date(fact) >= new Date(jsonValue[index]);
                });

                return valid;
            }
        } else if (jsonValue instanceof Array) {
            // compares a single date is not after a list of dates
            const factDt = new Date(factValue);

            let valid = true;
            jsonValue.forEach((jsonDt) => {
                valid = valid && factDt >= new Date(jsonDt);
            });

            return valid;
        }
        return new Date(factValue) <= new Date(jsonValue);
    },
};
