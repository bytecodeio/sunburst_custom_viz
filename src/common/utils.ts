import {
    VisConfig,
    VisQueryResponse,
    VisualizationDefinition
} from './types';

export const handleErrors = (vis: VisualizationDefinition, res: VisQueryResponse, options: VisConfig) => {

    const check = (group: string, noun: string, count: number, min: number, max: number): boolean => {
        if (!vis.addError || !vis.clearErrors) {
            return false;
        }
        if (count < min) {
            vis.addError({
                title: `Not Enough ${noun}s`,
                message: `This visualization requires ${min === max ? 'exactly' : 'at least'} ${min} ${noun.toLowerCase()}${min === 1 ? '' : 's'}.`,
                group
            });
            return false;
        }
        if (count > max) {
            vis.addError({
                title: `Too Many ${noun}s`,
                message: `This visualization requires ${min === max ? 'exactly' : 'no more than'} ${max} ${noun.toLowerCase()}${min === 1 ? '' : 's'}.`,
                group
            });
            return false
        }
        vis.clearErrors(group);
        return true;
    }

    const { pivots, dimensions, measure_like: measures } = res.fields;

    return (check('pivot-req', 'Pivot', pivots.length, options.min_pivots, options.max_pivots)
        && check('dim-req', 'Dimension', dimensions.length, options.min_dimensions, options.max_dimensions)
        && check('mes-req', 'Measure', measures.length, options.min_measures, options.max_measures));
};

export const lookupColor = (domainName: string): string => {
    let color: string;
    switch (domainName.trim().toLowerCase()) {
        case "mindset":
            color = "#FFD116";
            break;
        case "inspiring":
            color = "#39A6FF";
            break;
        case "thriving":
            color = "#FF6A4C";
            break;
        case "outcome":
            color = "#41B2A2";
            break;
        case "outcomes":
            color = "#41B2A2";
            break;
        default:
            color = "#2B333F";
    };
    return color;
};

export const lookupSecondaryColor = (domainName: string): string => {
    let color: string;
    switch (domainName.trim().toLowerCase()) {
        case "mindset":
            color = "#FFEEB2";
            break;
        case "inspiring":
            color = "#BBDFFF";
            break;
        case "thriving":
            color = "#FECCBC";
            break;
        case "outcome":
            color = "#A9DED7";
            break;
        case "outcomes":
            color = "#A9DED7";
            break;
        default:
            color = "#FFFFFF";
    }
    return color;
};

export const rounder = (float: number, digits: number): number => {
    let rounded = Math.round(float * 10 ** digits) / 10 ** digits;
    return rounded;
};

export const getDomainNameFromPrimaryLabel = (className: string, config: any, data: any): string => {
    let domainName: string = '';
    if (config.firstCategory == config.domain) {
        domainName = className;
    }
    else {
        domainName = data[0][config.domain].value;
    }
    return domainName;
};
