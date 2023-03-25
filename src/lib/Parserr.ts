
import * as ts from 'typescript';
import _ from 'lodash';

import Extractor from './Extractor';

import Session from './utils/Session';
import File from './utils/File';

import ITypeDescription from './types/ITypeDescription';
import IParserOpts from './types/IParserOpts';


class Parserr {

    private filesToExtract: Array<string> = [];

    public async parse(opts: IParserOpts): Promise<Array<ITypeDescription>> {
        await this.initialise(opts);

        this.trapDiagnostics();

        const schemaDescription = Extractor.getSchemaDescription();

        this.cleanUp();

        return schemaDescription;
    }

    private async initialise(opts: IParserOpts) {
        Session.setConfigOpts(opts);

        await this.loadFilePaths();

        this.createProgram();
    }

    private async loadFilePaths() {
        switch (true) {
            case Session.getConfigItem('useRelativePaths') && !Session.getConfigItem('callerBaseDir'):
                throw new Error(`Parserr cannot use relative input paths without a *callerBaseDir* config`);

            case !_.isEmpty(Session.getConfigItem('files')):
                this.filesToExtract = File.getNormalizedFilePaths();
                break;

            case !!Session.getConfigItem('targetDir'):
                this.filesToExtract = await File.extractNormalizedFilePaths();
                break;

            default:
                throw new Error(`Parserr requires either *files* or a *targetDir* config to function`);
        }
    }

    private createProgram() {
        const program = ts.createProgram(
            this.filesToExtract,
            {
                target: ts.ScriptTarget.ES2016,
                module: ts.ModuleKind.CommonJS
            }
        );

        Session.setProgram(program);
    }

    private cleanUp() {
        this.filesToExtract = [];
        Extractor.clean();
        Session.clear();
    }

    private trapDiagnostics() {
        const diagnostics = ts.getPreEmitDiagnostics(Session.getProgram());

        for (const diagnostic of diagnostics) {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

            console.error(message); // TODO: use input cfg logger if provided
        }
    }

}

export default new Parserr();