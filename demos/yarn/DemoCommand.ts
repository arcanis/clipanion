import {Command} from "../../sources/advanced";

export class DemoCommand extends Command {
  async execute() {
    console.log(`Executing`, this.path);
  }
}
